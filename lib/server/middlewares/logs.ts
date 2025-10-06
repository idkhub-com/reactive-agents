import { autoClusterSkill } from '@server/middlewares/optimizer/clustering';
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
import type { FunctionName } from '@shared/types/api/request';
import {
  type IdkConfig,
  NonPrivateIdkConfig,
} from '@shared/types/api/request/headers';
import type {
  SkillOptimizationArm,
  SkillOptimizationEvaluationResult,
  SkillOptimizationEvaluationRunCreateParams,
} from '@shared/types/data';
import type { Agent } from '@shared/types/data/agent';
import type { Log, LogMessage, LogsClient } from '@shared/types/data/log';
import type { Skill } from '@shared/types/data/skill';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type {
  AIProviderRequestLog,
  HookLog,
  LogResponseBodyError,
} from '@shared/types/idkhub/observability';
import type { MiddlewareHandler } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import type { Factory } from 'hono/factory';
import { v4 as uuidv4 } from 'uuid';

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
  idkConfig: IdkConfig;
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
  idkConfig,
  agent,
  skill,
  startTime,
  aiProviderLog,
  embedding,
  hookLogs,
  logsStorageConnector,
  userDataStorageConnector,
  evaluationConnectorsMap,
}: ProcessLogsParams): Promise<SkillOptimizationEvaluationResult[]> {
  const endTime = Date.now();
  const duration = endTime - startTime;

  const baseIdkConfig = NonPrivateIdkConfig.parse(idkConfig);

  if (!('model' in aiProviderLog.request_body)) {
    console.error('No model found in request body');
    return [];
  }

  const log: Log = {
    id: uuidv4(),
    agent_id: agent.id,
    skill_id: skill.id,
    start_time: startTime,
    end_time: endTime,
    duration: duration,
    trace_id: idkConfig.trace_id,
    status: status,
    method: method,
    model: (aiProviderLog.request_body.model as string | undefined) || '',
    metadata: {},
    hook_logs: hookLogs,
    function_name: functionName,
    ai_provider_request_log: aiProviderLog,
    embedding: embedding,
    endpoint: url.pathname,
    base_idk_config: baseIdkConfig,
    ai_provider: aiProviderLog.provider,
    cache_status: aiProviderLog.cache_status,
    parent_span_id: idkConfig.parent_span_id || null,
    span_id: idkConfig.span_id || null,
    span_name: idkConfig.span_name || null,
    app_id: idkConfig.app_id || null,
    external_user_id:
      (aiProviderLog.request_body.user as string | null) || null,
    external_user_human_name: idkConfig.user_human_name || null,
    user_metadata: null,
  };

  const responseString = JSON.stringify(log);

  if (responseString.length > MAX_RESPONSE_LENGTH) {
    const error: LogResponseBodyError = {
      message:
        'The response was too large to be processed. It has been truncated.',
      response: `${responseString.substring(0, MAX_RESPONSE_LENGTH)}...`,
    };
    log.ai_provider_request_log.response_body = error;
  }

  await broadcastLog(JSON.stringify(log));

  // Store the log in the configured logs storage connector
  try {
    await logsStorageConnector.createLog(log);
  } catch (error) {
    console.error(error);
  }

  // Trigger realtime evaluations if conditions are met
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
        log,
        evaluations,
        evaluationConnectorsMap,
      );
      return results;
    }
  }
  return [];
}

const shouldLogRequest = (url: URL): boolean => {
  // Only log requests to the IDK API
  if (!url.pathname.startsWith('/v1/')) {
    return false;
  }

  // Don't log requests to the IDK app APIs
  if (url.pathname.startsWith('/v1/idk')) {
    return false;
  }

  return true;
};

async function updatePulledArm(
  userDataStorageConnector: UserDataStorageConnector,
  arm: SkillOptimizationArm,
  evaluationResults: SkillOptimizationEvaluationResult[],
) {
  // Calculate average score from all evaluations (normalized 0-1)
  const scores = evaluationResults.map((result) => result.score);

  const reward = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  await updateArmStats(userDataStorageConnector, arm, reward);
}

async function updateArmStats(
  userDataStorageConnector: UserDataStorageConnector,
  arm: SkillOptimizationArm,
  reward: number,
) {
  // Update arm statistics using incremental update formulas for Thompson Sampling
  const newN = arm.stats.n + 1;
  const newTotalReward = arm.stats.total_reward + reward;
  const newMean = newTotalReward / newN;
  const newN2 = arm.stats.n2 + reward * reward;

  await userDataStorageConnector.updateSkillOptimizationArm(arm.id, {
    stats: {
      n: newN,
      mean: newMean,
      n2: newN2,
      total_reward: newTotalReward,
    },
  });
}

async function addSkillOptimizationEvaluationRun(
  userDataStorageConnector: UserDataStorageConnector,
  arm: SkillOptimizationArm,
  evaluationResults: SkillOptimizationEvaluationResult[],
) {
  const createParams: SkillOptimizationEvaluationRunCreateParams = {
    agent_id: arm.agent_id,
    skill_id: arm.skill_id,
    cluster_id: arm.cluster_id,
    results: evaluationResults,
  };

  await userDataStorageConnector.createSkillOptimizationEvaluationRun(
    createParams,
  );
}

async function updateClusterState(
  userDataStorageConnector: UserDataStorageConnector,
  pulledArm: SkillOptimizationArm,
) {
  const clusters = await userDataStorageConnector.getSkillOptimizationClusters({
    id: pulledArm.cluster_id,
  });

  if (!clusters) {
    throw new Error(`Cluster not found`);
  }

  const cluster = clusters[0];

  await userDataStorageConnector.updateSkillOptimizationCluster(cluster.id, {
    total_steps: cluster.total_steps + 1,
  });
}

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
      console.error('No ai provider log found');
      return;
    }

    // Logs produced by the hooks middleware
    const hookLogs = c.get('hook_logs') || [];

    const idkRequestData = c.get('idk_request_data');
    const pulledArm = c.get('pulled_arm');

    const processLogsParams: ProcessLogsParams = {
      url,
      status: c.res.status,
      method: idkRequestData.method,
      functionName: idkRequestData.functionName,
      idkConfig: c.get('idk_config'),
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
