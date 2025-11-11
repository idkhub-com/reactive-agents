import {
  autoClusterSkill,
  updateClusterState,
} from '@server/middlewares/optimizer/clusters';
import {
  addSkillOptimizationEvaluationRun,
  checkAndRegenerateEvaluationsEarly,
} from '@server/middlewares/optimizer/evaluations';
import { updatePulledArm } from '@server/middlewares/optimizer/hyperparameters';
import { autoGenerateSystemPromptsForSkill } from '@server/middlewares/optimizer/system-prompt';
import type {
  EvaluationMethodConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { AppEnv } from '@server/types/hono';
import type { HttpMethod } from '@server/types/http';
import {
  runEvaluationsForLog,
  shouldTriggerRealtimeEvaluation,
} from '@server/utils/realtime-evaluations';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import { error } from '@shared/console-logging';
import type { FunctionName } from '@shared/types/api/request';
import {
  NonPrivateReactiveAgentsConfig,
  type ReactiveAgentsConfig,
} from '@shared/types/api/request/headers';
import type {
  SkillOptimizationArm,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Agent } from '@shared/types/data/agent';
import type {
  AIProviderRequestLog,
  HookLog,
  LogCreateParams,
  LogMessage,
  LogResponseBodyError,
  LogsClient,
} from '@shared/types/data/log';
import type { Skill } from '@shared/types/data/skill';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import type { MiddlewareHandler } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import type { Factory } from 'hono/factory';

let logId = 0;
const MAX_RESPONSE_LENGTH = 100000;

// Map to store all connected log clients
const logsClients: Map<string, LogsClient> = new Map();

const addLogsClient = (clientId: string, client: LogsClient): void => {
  logsClients.set(clientId, client);
};

const removeLogsClient = (clientId: string): void => {
  logsClients.delete(clientId);
};

const broadcastLog = async (log: string): Promise<void> => {
  const message: LogMessage = {
    data: log,
    event: 'log',
    id: String(logId++),
  };

  const deadClients: string[] = [];

  // Run all sends in parallel
  await Promise.all(
    Array.from(logsClients.entries()).map(async ([id, client]) => {
      try {
        await Promise.race([
          client.sendLog(message),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Send timeout')), 1000),
          ),
        ]);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Failed to send log to client ${id}:`, error.message);
        } else {
          console.error(`Failed to send log to client ${id}:`, error);
        }
        deadClients.push(id);
      }
    }),
  );

  // Remove dead clients after iteration
  deadClients.forEach((id: string) => {
    removeLogsClient(id);
  });
};

interface ProcessLogsParams {
  url: URL;
  status: number;
  method: HttpMethod;
  functionName: FunctionName;
  raConfig: ReactiveAgentsConfig;
  agent: Agent;
  skill: Skill;
  startTime: number;
  aiProviderLog: AIProviderRequestLog;
  embedding: number[] | null;
  hookLogs: HookLog[];
  logsStorageConnector: LogsStorageConnector;
  userDataStorageConnector: UserDataStorageConnector;
  evaluationConnectorsMap?: Partial<
    Record<EvaluationMethodName, EvaluationMethodConnector>
  >;
  pulledArm?: SkillOptimizationArm;
}

async function processLogs({
  url,
  status,
  method,
  functionName,
  raConfig,
  agent,
  skill,
  startTime,
  aiProviderLog,
  embedding,
  hookLogs,
  logsStorageConnector,
  userDataStorageConnector,
  evaluationConnectorsMap,
  pulledArm,
}: ProcessLogsParams): Promise<SkillOptimizationEvaluationResult[]> {
  const endTime = Date.now();
  const duration = endTime - startTime;

  const baseReactiveAgentsConfig =
    NonPrivateReactiveAgentsConfig.parse(raConfig);

  if (!('model' in aiProviderLog.request_body)) {
    error('No model found in request body');
    return [];
  }

  const createParams: LogCreateParams = {
    agent_id: agent.id,
    skill_id: skill.id,
    cluster_id: pulledArm?.cluster_id,
    start_time: startTime,
    end_time: endTime,
    duration: duration,
    trace_id: raConfig.trace_id,
    status: status,
    method: method,
    model: (aiProviderLog.request_body.model as string | undefined) || '',
    metadata: {},
    hook_logs: hookLogs,
    function_name: functionName,
    ai_provider_request_log: aiProviderLog,
    embedding: embedding ?? undefined,
    endpoint: url.pathname,
    base_ra_config: baseReactiveAgentsConfig,
    ai_provider: aiProviderLog.provider,
    cache_status: aiProviderLog.cache_status,
    parent_span_id: raConfig.parent_span_id,
    span_id: raConfig.span_id,
    span_name: raConfig.span_name,
    app_id: raConfig.app_id,
    external_user_id:
      (aiProviderLog.request_body.user as string | null) || undefined,
    external_user_human_name: raConfig.user_human_name || undefined,
    user_metadata: undefined,
  };

  const responseString = JSON.stringify(createParams);

  if (responseString.length > MAX_RESPONSE_LENGTH) {
    const error: LogResponseBodyError = {
      message:
        'The response was too large to be processed. It has been truncated.',
      response: `${responseString.substring(0, MAX_RESPONSE_LENGTH)}...`,
    };
    createParams.ai_provider_request_log.response_body = error;
  }

  await broadcastLog(JSON.stringify(createParams));

  // Store the log in the configured logs storage connector
  try {
    const insertedLog = await logsStorageConnector.createLog(createParams);

    // Emit SSE event for real-time log updates
    emitSSEEvent('log:created', {
      logId: insertedLog.id,
      agentId: agent.id,
      skillId: skill.id,
    });

    // Trigger evaluations if conditions are met
    if (
      shouldTriggerRealtimeEvaluation(status, url) &&
      userDataStorageConnector &&
      evaluationConnectorsMap
    ) {
      const evaluations =
        await userDataStorageConnector.getSkillOptimizationEvaluations({
          agent_id: skill.agent_id,
          skill_id: skill.id,
        });

      if (evaluations.length > 0) {
        const results = await runEvaluationsForLog(
          insertedLog,
          evaluations,
          evaluationConnectorsMap,
        );
        return results;
      }
    }
  } catch (e) {
    error('Error creating log', e);
  }
  return [];
}

const shouldLogRequest = (url: URL): boolean => {
  // Only log requests to the Reactive Agents API
  if (!url.pathname.startsWith('/v1/')) {
    return false;
  }

  // Don't log requests to the Reactive Agents app APIs
  if (url.pathname.startsWith('/v1/reactive-agents')) {
    return false;
  }

  return true;
};

async function processLogsAndOptimizeSkill(
  processLogsParams: ProcessLogsParams,
) {
  const evaluationResults = await processLogs(processLogsParams);
  if (evaluationResults.length > 0 && processLogsParams.pulledArm) {
    await updatePulledArm(
      processLogsParams.userDataStorageConnector,
      processLogsParams.pulledArm,
      evaluationResults,
    );
    await addSkillOptimizationEvaluationRun(
      processLogsParams.userDataStorageConnector,
      processLogsParams.pulledArm,
      evaluationResults,
    );

    // Check if we should regenerate evaluations early (after first 5 requests)
    if (processLogsParams.evaluationConnectorsMap) {
      await checkAndRegenerateEvaluationsEarly(
        processLogsParams.functionName,
        processLogsParams.userDataStorageConnector,
        processLogsParams.logsStorageConnector,
        processLogsParams.skill,
        processLogsParams.agent.description,
        processLogsParams.evaluationConnectorsMap as Record<
          string,
          EvaluationMethodConnector
        >,
      );
    }

    await updateClusterState(
      processLogsParams.userDataStorageConnector,
      processLogsParams.pulledArm,
    );
    await autoClusterSkill(
      processLogsParams.functionName,
      processLogsParams.userDataStorageConnector,
      processLogsParams.logsStorageConnector,
      processLogsParams.skill,
    );
    await autoGenerateSystemPromptsForSkill(
      processLogsParams.functionName,
      processLogsParams.userDataStorageConnector,
      processLogsParams.logsStorageConnector,
      processLogsParams.skill,
    );
  }
}

export const logsMiddleware = (
  factory: Factory<AppEnv>,
  connector: LogsStorageConnector,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    c.set('logs_storage_connector', connector);
    c.set('addLogsClient', addLogsClient);
    c.set('removeLogsClient', removeLogsClient);

    const startTime = Date.now();

    await next();

    const url = new URL(c.req.url);

    if (!shouldLogRequest(url)) {
      return;
    }

    const aiProviderLog = c.get('ai_provider_log');

    // Log produced when calling the AI provider
    if (!aiProviderLog) {
      return;
    }

    // Logs produced by the hooks middleware
    const hookLogs = c.get('hook_logs') || [];

    const raRequestData = c.get('ra_request_data');
    const pulledArm = c.get('pulled_arm');

    const processLogsParams: ProcessLogsParams = {
      url,
      status: c.res.status,
      method: raRequestData.method,
      functionName: raRequestData.functionName,
      raConfig: c.get('ra_config'),
      agent: c.get('agent'),
      skill: c.get('skill'),
      startTime,
      aiProviderLog,
      embedding: c.get('embedding'),
      hookLogs,
      logsStorageConnector: c.get('logs_storage_connector'),
      userDataStorageConnector: c.get('user_data_storage_connector'),
      evaluationConnectorsMap: c.get('evaluation_connectors_map'),
      pulledArm,
    };

    if (getRuntimeKey() === 'workerd') {
      c.executionCtx.waitUntil(processLogsAndOptimizeSkill(processLogsParams));
    } else {
      processLogsAndOptimizeSkill(processLogsParams);
    }
  });
