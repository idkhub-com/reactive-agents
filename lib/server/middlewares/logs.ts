import { autoClusterSkill } from '@server/middlewares/optimizer/clusters';
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

/**
 * Parse accumulated SSE stream chunks and reconstruct the response body
 */
function parseStreamChunksToResponseBody(
  accumulatedChunks: string,
  functionName?: string,
): {
  response_body: Record<string, unknown>;
  raw_response_body: string;
} {
  const lines = accumulatedChunks.split('\n');
  let accumulatedContent = '';
  let id = '';
  let model = '';
  let created = 0;
  const toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }> = [];
  let currentToolCall: {
    index: number;
    id: string;
    type: string;
    function: { name: string; arguments: string };
  } | null = null;

  // Track Responses API function calls by output_index
  const responsesAPIFunctionCalls = new Map<
    number,
    {
      type: 'function_call';
      id: string;
      call_id: string;
      name: string;
      arguments: string;
      status: string;
    }
  >();

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    const data = line.slice(6).trim();
    if (data === '[DONE]') continue;

    try {
      const chunk = JSON.parse(data);
      if (!id && chunk.id) id = chunk.id;
      if (!model && chunk.model) model = chunk.model;
      if (!created && chunk.created) created = chunk.created;

      // Handle Responses API format (response.output_text.delta)
      if (chunk.type === 'response.output_text.delta' && chunk.delta) {
        accumulatedContent += chunk.delta;
      }
      // Handle Responses API function_call item added
      else if (
        chunk.type === 'response.output_item.added' &&
        chunk.item?.type === 'function_call'
      ) {
        responsesAPIFunctionCalls.set(chunk.output_index, {
          type: 'function_call',
          id: chunk.item.id || '',
          call_id: chunk.item.call_id || '',
          name: chunk.item.name || '',
          arguments: chunk.item.arguments || '',
          status: chunk.item.status || 'in_progress',
        });
      }
      // Handle Responses API function_call arguments delta
      else if (chunk.type === 'response.function_call_arguments.delta') {
        const funcCall = responsesAPIFunctionCalls.get(chunk.output_index);
        if (funcCall && chunk.delta) {
          funcCall.arguments += chunk.delta;
        }
      }
      // Handle Responses API function_call arguments done
      else if (chunk.type === 'response.function_call_arguments.done') {
        const funcCall = responsesAPIFunctionCalls.get(chunk.output_index);
        if (funcCall && chunk.arguments) {
          funcCall.arguments = chunk.arguments;
        }
      }
      // Handle Responses API function_call item done
      else if (
        chunk.type === 'response.output_item.done' &&
        chunk.item?.type === 'function_call'
      ) {
        const funcCall = responsesAPIFunctionCalls.get(chunk.output_index);
        if (funcCall) {
          funcCall.status = chunk.item.status || 'completed';
          if (chunk.item.id) funcCall.id = chunk.item.id;
          if (chunk.item.call_id) funcCall.call_id = chunk.item.call_id;
          if (chunk.item.name) funcCall.name = chunk.item.name;
          if (chunk.item.arguments) funcCall.arguments = chunk.item.arguments;
        }
      }
      // Extract response ID from Responses API completed event
      else if (chunk.type === 'response.completed' && chunk.response) {
        if (!id && chunk.response.id) id = chunk.response.id;
        if (!model && chunk.response.model) model = chunk.response.model;
        if (!created && chunk.response.created_at)
          created = chunk.response.created_at;
      }
      // Handle Chat Completions format
      else if (chunk.choices?.[0]?.delta) {
        const delta = chunk.choices[0].delta;

        // Accumulate content
        if (delta.content) {
          accumulatedContent += delta.content;
        }

        // Accumulate tool calls
        if (delta.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (
                !currentToolCall ||
                currentToolCall.index !== toolCallDelta.index
              ) {
                if (currentToolCall) {
                  toolCalls.push({
                    id: currentToolCall.id,
                    type: currentToolCall.type,
                    function: currentToolCall.function,
                  });
                }
                currentToolCall = {
                  index: toolCallDelta.index,
                  id: toolCallDelta.id || '',
                  type: toolCallDelta.type || 'function',
                  function: { name: '', arguments: '' },
                };
              }

              if (toolCallDelta.id) currentToolCall.id = toolCallDelta.id;
              if (toolCallDelta.type) currentToolCall.type = toolCallDelta.type;
              if (toolCallDelta.function?.name) {
                currentToolCall.function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                currentToolCall.function.arguments +=
                  toolCallDelta.function.arguments;
              }
            }
          }
        }
      }
    } catch {
      // Skip malformed chunks
    }
  }

  // Add the last tool call if any
  if (currentToolCall) {
    toolCalls.push({
      id: currentToolCall.id,
      type: currentToolCall.type,
      function: currentToolCall.function,
    });
  }

  let response_body: Record<string, unknown>;

  // Construct response body in the appropriate format
  if (functionName === 'create_model_response') {
    // Responses API format
    // Build output array with all items (messages and function_calls)
    const outputItems: Record<string, unknown>[] = [];

    // Add message item if there's content
    if (accumulatedContent) {
      outputItems.push({
        id: `msg-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: accumulatedContent,
            annotations: [],
          },
        ],
        status: 'completed',
      });
    }

    // Add function_call items from the map (sorted by output_index)
    const sortedFunctionCalls = Array.from(
      responsesAPIFunctionCalls.entries(),
    ).sort(([a], [b]) => a - b);
    for (const [, funcCall] of sortedFunctionCalls) {
      outputItems.push({
        type: funcCall.type,
        id: funcCall.id,
        call_id: funcCall.call_id,
        name: funcCall.name,
        arguments: funcCall.arguments,
        status: funcCall.status,
      });
    }

    response_body = {
      id: id || `resp-${Date.now()}`,
      object: 'response',
      created_at: created || Math.floor(Date.now() / 1000),
      model: model || 'unknown',
      status: 'completed',
      output: outputItems,
      // Required nullable fields
      error: null,
      incomplete_details: null,
      instructions: null,
      metadata: null,
      output_text: accumulatedContent || null,
      parallel_tool_calls: null,
      previous_response_id: null,
      reasoning: null,
      temperature: null,
      text: null,
      tool_choice: null,
      tools: [],
      usage: null,
      user: null,
    };
  } else {
    // Chat Completion format (default)
    response_body = {
      id: id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: created || Math.floor(Date.now() / 1000),
      model: model || 'unknown',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: accumulatedContent || null,
            ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
          },
          finish_reason: 'stop',
        },
      ],
    };
  }

  return {
    response_body,
    raw_response_body: JSON.stringify(response_body),
  };
}

interface ProcessLogsParams {
  url: URL;
  status: number;
  method: HttpMethod;
  functionName: FunctionName;
  raConfig: ReactiveAgentsConfig;
  agent: Agent;
  skill: Skill;
  startTime: number;
  endTime: number;
  firstTokenTime?: number;
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
  endTime,
  firstTokenTime,
  aiProviderLog,
  embedding,
  hookLogs,
  logsStorageConnector,
  userDataStorageConnector,
  evaluationConnectorsMap,
  pulledArm,
}: ProcessLogsParams): Promise<{
  evaluationResults: SkillOptimizationEvaluationResult[];
  logId: string | null;
  evaluationsPromise?: Promise<SkillOptimizationEvaluationResult[]>;
}> {
  const duration = endTime - startTime;

  const baseReactiveAgentsConfig =
    NonPrivateReactiveAgentsConfig.parse(raConfig);

  if (!('model' in aiProviderLog.request_body)) {
    error('No model found in request body');
    return { evaluationResults: [], logId: null };
  }

  const createParams: LogCreateParams = {
    agent_id: agent.id,
    skill_id: skill.id,
    cluster_id: pulledArm?.cluster_id,
    start_time: startTime,
    first_token_time: firstTokenTime,
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

    // Emit SSE event for real-time log updates with full log data
    emitSSEEvent('log:created', {
      log: insertedLog,
    });

    // Trigger evaluations asynchronously (non-blocking) if conditions are met
    if (
      shouldTriggerRealtimeEvaluation(status, url) &&
      userDataStorageConnector &&
      evaluationConnectorsMap
    ) {
      // Run evaluations in the background without blocking log creation
      const evaluationsPromise: Promise<SkillOptimizationEvaluationResult[]> =
        Promise.resolve(
          userDataStorageConnector.getSkillOptimizationEvaluations({
            agent_id: skill.agent_id,
            skill_id: skill.id,
          }),
        )
          .then((evaluations) => {
            if (evaluations.length > 0) {
              return runEvaluationsForLog(
                insertedLog,
                evaluations,
                evaluationConnectorsMap,
              );
            }
            return [];
          })
          .catch((e: unknown) => {
            error('Error running evaluations for log', e);
            return [];
          });

      // Return promise for background processing
      return {
        evaluationResults: [],
        logId: insertedLog.id,
        evaluationsPromise,
      };
    }

    return { evaluationResults: [], logId: insertedLog.id };
  } catch (e) {
    error('Error creating log', e);
  }
  return { evaluationResults: [], logId: null };
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
  const { evaluationResults, logId, evaluationsPromise } =
    await processLogs(processLogsParams);

  // If we pulled an arm, handle arm updates and optimization
  if (processLogsParams.pulledArm) {
    // If evaluations are running in the background, wait for them and update the arm
    if (evaluationsPromise && logId) {
      evaluationsPromise
        .then(async (results) => {
          if (results.length > 0 && processLogsParams.pulledArm) {
            // Update arm stats with real scores
            await updatePulledArm(
              processLogsParams.userDataStorageConnector,
              processLogsParams.pulledArm,
              results,
            );
            await addSkillOptimizationEvaluationRun(
              processLogsParams.userDataStorageConnector,
              processLogsParams.pulledArm,
              logId,
              results,
            );
          }
        })
        .catch((e: unknown) => {
          error('Error updating arm with evaluation results', e);
          // Still emit SSE event so client knows a request was processed
          if (processLogsParams.pulledArm) {
            emitSSEEvent('skill-optimization:arm-updated', {
              armId: processLogsParams.pulledArm.id,
              skillId: processLogsParams.pulledArm.skill_id,
              clusterId: processLogsParams.pulledArm.cluster_id,
            });
          }
        });
    } else if (evaluationResults.length > 0 && logId) {
      // We have synchronous evaluation results - update arm stats with real scores
      await updatePulledArm(
        processLogsParams.userDataStorageConnector,
        processLogsParams.pulledArm,
        evaluationResults,
      );
      await addSkillOptimizationEvaluationRun(
        processLogsParams.userDataStorageConnector,
        processLogsParams.pulledArm,
        logId,
        evaluationResults,
      );
    } else {
      // No evaluation results (evaluations failed or not configured)
      // Still emit SSE event so client knows a request was processed
      emitSSEEvent('skill-optimization:arm-updated', {
        armId: processLogsParams.pulledArm.id,
        skillId: processLogsParams.pulledArm.skill_id,
        clusterId: processLogsParams.pulledArm.cluster_id,
      });
    }

    // Check if we should regenerate evaluations early (after first 5 requests)
    if (processLogsParams.evaluationConnectorsMap) {
      await checkAndRegenerateEvaluationsEarly(
        processLogsParams.functionName,
        processLogsParams.userDataStorageConnector,
        processLogsParams.logsStorageConnector,
        processLogsParams.skill,
        processLogsParams.agent.description,
        processLogsParams.evaluationConnectorsMap,
      );
    }
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

    // For streaming requests, wait for the stream to complete before logging
    const streamEndPromise = c.get('stream_end_promise') as
      | Promise<void>
      | undefined;

    const processLogsAsync = async () => {
      // Wait for stream to end if it's a streaming request
      if (streamEndPromise) {
        await streamEndPromise;
      }

      // For streaming requests, parse accumulated chunks and update the log
      const accumulatedChunks = c.get('accumulated_stream_chunks') as
        | string
        | undefined;
      const raRequestData = c.get('ra_request_data');
      if (accumulatedChunks && aiProviderLog && raRequestData) {
        try {
          const { response_body, raw_response_body } =
            parseStreamChunksToResponseBody(
              accumulatedChunks,
              raRequestData.functionName,
            );
          aiProviderLog.response_body = response_body;
          aiProviderLog.raw_response_body = raw_response_body;
        } catch (e) {
          error('Failed to parse stream chunks', e);
          // Keep the null/empty values if parsing fails
        }
      }

      // Logs produced by the hooks middleware
      const hookLogs = c.get('hook_logs') || [];
      const pulledArm = c.get('pulled_arm');

      // Use stream_end_time if available (for streaming requests), otherwise use current time
      const endTime =
        (c.get('stream_end_time') as number | undefined) || Date.now();

      // Validate that we don't save incomplete logs for successful requests
      if (aiProviderLog && c.res.status >= 200 && c.res.status < 300) {
        const hasEmptyResponseBody =
          aiProviderLog.response_body === null ||
          (typeof aiProviderLog.response_body === 'object' &&
            Object.keys(aiProviderLog.response_body).length === 0);
        const hasEmptyRawResponseBody =
          !aiProviderLog.raw_response_body ||
          aiProviderLog.raw_response_body.trim() === '';

        if (hasEmptyResponseBody || hasEmptyRawResponseBody) {
          error(
            '[Logs] Skipping log creation - successful request but missing response body',
            {
              status: c.res.status,
              hasEmptyResponseBody,
              hasEmptyRawResponseBody,
              functionName: raRequestData.functionName,
            },
          );
          return; // Skip saving this log
        }
      }

      const processLogsParams: ProcessLogsParams = {
        url,
        status: c.res.status,
        method: raRequestData.method,
        functionName: raRequestData.functionName,
        raConfig: c.get('ra_config'),
        agent: c.get('agent'),
        skill: c.get('skill'),
        startTime,
        endTime,
        firstTokenTime: c.get('first_token_time'),
        aiProviderLog,
        embedding: c.get('embedding'),
        hookLogs,
        logsStorageConnector: c.get('logs_storage_connector'),
        userDataStorageConnector: c.get('user_data_storage_connector'),
        evaluationConnectorsMap: c.get('evaluation_connectors_map'),
        pulledArm,
      };

      await processLogsAndOptimizeSkill(processLogsParams);
    };

    if (getRuntimeKey() === 'workerd') {
      c.executionCtx.waitUntil(processLogsAsync());
    } else {
      processLogsAsync();
    }
  });
