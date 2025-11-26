import { generateReflectiveSystemPromptForSkill } from '@server/optimization/utils/system-prompt';
import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { formatMessagesForExtraction } from '@server/utils/messages';
import { extractMessagesFromRequestData } from '@server/utils/reactive-agents/requests';
import { extractOutputFromResponseBody } from '@server/utils/reactive-agents/responses';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import { error } from '@shared/console-logging';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type { Log, Skill, SkillOptimizationCluster } from '@shared/types/data';
import { SkillEventType } from '@shared/types/data/skill-event';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';

/**
 * Extracts relevant request parameters that affect the output format and constraints.
 * This includes structured output requirements, tool definitions, and sampling parameters.
 */
function extractRequestConstraints(
  raRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
): string {
  const constraints: string[] = [];

  // Extract response format (JSON schema, structured output)
  if ('response_format' in raRequestData && raRequestData.response_format) {
    constraints.push(
      `Response Format: ${JSON.stringify(raRequestData.response_format, null, 2)}`,
    );
  }

  // Extract text config for Responses API
  if ('text' in raRequestData && raRequestData.text) {
    constraints.push(
      `Text Config: ${JSON.stringify(raRequestData.text, null, 2)}`,
    );
  }

  // Extract tools/functions
  if ('tools' in raRequestData && raRequestData.tools) {
    constraints.push(
      `Available Tools: ${JSON.stringify(raRequestData.tools, null, 2)}`,
    );
  }

  if ('functions' in raRequestData && raRequestData.functions) {
    constraints.push(
      `Available Functions: ${JSON.stringify(raRequestData.functions, null, 2)}`,
    );
  }

  // Extract tool choice constraints
  if ('tool_choice' in raRequestData && raRequestData.tool_choice) {
    constraints.push(
      `Tool Choice: ${JSON.stringify(raRequestData.tool_choice)}`,
    );
  }

  if ('function_call' in raRequestData && raRequestData.function_call) {
    constraints.push(
      `Function Call: ${JSON.stringify(raRequestData.function_call)}`,
    );
  }

  // Note: We intentionally skip sampling parameters like temperature, max_tokens, reasoning_effort
  // as they don't affect the task structure or requirements for the system prompt

  return constraints.length > 0
    ? `\n\nRequest Constraints:\n${constraints.join('\n')}`
    : '';
}

/**
 * Attempts to acquire a reflection lock for a cluster
 * Returns the lock timestamp if successful, null otherwise
 */
async function acquireReflectionLock(
  userDataStorageConnector: UserDataStorageConnector,
  _skill: Skill,
  clusterId: string,
): Promise<string | null> {
  // Re-fetch cluster to get latest state (critical for lock check)
  const latestClusters =
    await userDataStorageConnector.getSkillOptimizationClusters({
      id: clusterId,
    });

  if (latestClusters.length === 0) {
    return null;
  }

  const latestCluster = latestClusters[0];

  // Check if reflection lock exists and is recent (< 10 minutes old)
  const lockTimestamp = latestCluster.reflection_lock_acquired_at;
  if (lockTimestamp) {
    const lockAge = Date.now() - new Date(lockTimestamp).getTime();
    const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    if (lockAge < LOCK_TIMEOUT_MS) {
      return null;
    }
  }

  // Try to acquire lock by updating the cluster
  const lockTime = new Date().toISOString();
  try {
    await userDataStorageConnector.updateSkillOptimizationCluster(clusterId, {
      reflection_lock_acquired_at: lockTime,
    });
  } catch (_error) {
    return null;
  }

  // CRITICAL: Double-check the lock after acquisition to detect race conditions
  const postLockClusters =
    await userDataStorageConnector.getSkillOptimizationClusters({
      id: clusterId,
    });

  if (postLockClusters.length === 0) {
    return null;
  }

  const postLockCluster = postLockClusters[0];

  // Check if our lock is still there (not overwritten by another process)
  const postLockTime = postLockCluster.reflection_lock_acquired_at
    ? new Date(postLockCluster.reflection_lock_acquired_at).getTime()
    : null;
  const expectedLockTime = new Date(lockTime).getTime();

  if (postLockTime !== expectedLockTime) {
    return null;
  }

  return lockTime;
}

/**
 * Releases the reflection lock for a cluster
 */
async function releaseReflectionLock(
  userDataStorageConnector: UserDataStorageConnector,
  clusterId: string,
) {
  await userDataStorageConnector.updateSkillOptimizationCluster(clusterId, {
    reflection_lock_acquired_at: null,
  });
}

/**
 * Calculates weighted stats for all arms in a cluster efficiently
 */
async function calculateClusterArmStats(
  userDataStorageConnector: UserDataStorageConnector,
  cluster: SkillOptimizationCluster,
  clusterArms: Awaited<
    ReturnType<UserDataStorageConnector['getSkillOptimizationArms']>
  >,
) {
  // Fetch evaluations to get weights (once for the whole cluster)
  const evaluations =
    await userDataStorageConnector.getSkillOptimizationEvaluations({
      skill_id: cluster.skill_id,
    });

  // Create a map of evaluation_id -> weight
  const evaluationWeights = new Map<string, number>();
  for (const evaluation of evaluations) {
    evaluationWeights.set(evaluation.id, evaluation.weight);
  }

  // Fetch ALL arm_stats for the cluster in one query (efficient!)
  const allArmStats =
    await userDataStorageConnector.getSkillOptimizationArmStats({
      cluster_id: cluster.id,
    });

  // Group arm_stats by arm_id
  const armStatsGrouped = new Map<string, typeof allArmStats>();
  for (const stat of allArmStats) {
    const existing = armStatsGrouped.get(stat.arm_id) || [];
    existing.push(stat);
    armStatsGrouped.set(stat.arm_id, existing);
  }

  // Calculate weighted stats for all arms
  const armStatsMap = new Map<
    string,
    { n: number; weighted_mean: number; arm: (typeof clusterArms)[0] }
  >();

  for (const arm of clusterArms) {
    const armStats = armStatsGrouped.get(arm.id) || [];

    // Calculate weighted average mean
    let weightedMeanSum = 0;
    let totalWeight = 0;
    let totalRequests = 0;

    for (const stat of armStats) {
      const weight = evaluationWeights.get(stat.evaluation_id) || 1.0;
      weightedMeanSum += stat.mean * weight;
      totalWeight += weight;
      // Use max n across all evaluations as the request count
      if (stat.n > totalRequests) {
        totalRequests = stat.n;
      }
    }

    // Calculate weighted mean (0 if no stats yet)
    const weightedMean = totalWeight > 0 ? weightedMeanSum / totalWeight : 0;

    armStatsMap.set(arm.id, {
      n: totalRequests,
      weighted_mean: weightedMean,
      arm,
    });
  }

  return { armStatsMap, evaluationWeights };
}

/**
 * Fetches example logs for reflection (best and worst performing)
 * - Best: Single best log from all time
 * - Worst: Worst logs since last reflection only
 */
async function fetchReflectionExamples(
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  cluster: SkillOptimizationCluster,
) {
  // Find the last reflection event for this cluster
  const lastReflectionEvents = await userDataStorageConnector.getSkillEvents({
    cluster_id: cluster.id,
    event_type: SkillEventType.REFLECTION,
    limit: 1,
  });

  const lastReflectionTime = lastReflectionEvents[0]?.created_at;

  // Fetch best log from all time (no time filter)
  const allTimeLogs = await logsStorageConnector.getLogs({
    skill_id: cluster.skill_id,
    cluster_id: cluster.id,
    embedding_not_null: true,
    limit: 50, // Get more logs to find the absolute best
  });

  // Sort by score and take the single best log from all time
  const bestLog = allTimeLogs
    .map((log) => ({
      log,
      score: log.avg_eval_score ?? 0,
    }))
    .sort((a, b) => b.score - a.score)[0]?.log;

  const bestExamples = bestLog ? generateExampleConversations([bestLog]) : [];

  // Fetch worst logs since last reflection (or all time if no reflection yet)
  const recentLogs = await logsStorageConnector.getLogs({
    skill_id: cluster.skill_id,
    cluster_id: cluster.id,
    embedding_not_null: true,
    after: lastReflectionTime
      ? new Date(lastReflectionTime).getTime()
      : undefined, // Will be undefined if no reflection yet, which fetches all logs
    limit: 15, // Get enough logs to find worst ones
  });

  // Sort by score and take bottom 5 worst logs
  const worstLogs = recentLogs
    .map((log) => ({
      log,
      score: log.avg_eval_score ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(-5)
    .map((l) => l.log);

  // For worst examples, include evaluation information
  const worstExamples = await generateExampleConversationsWithEvaluations(
    userDataStorageConnector,
    worstLogs,
  );

  return { bestExamples, worstExamples };
}

/**
 * Performs reflection: updates arms with new prompt and resets stats
 */
async function performReflection(
  userDataStorageConnector: UserDataStorageConnector,
  cluster: SkillOptimizationCluster,
  skill: Skill,
  clusterArms: Awaited<
    ReturnType<UserDataStorageConnector['getSkillOptimizationArms']>
  >,
  armStatsMap: Map<
    string,
    {
      n: number;
      weighted_mean: number;
      arm: Awaited<
        ReturnType<UserDataStorageConnector['getSkillOptimizationArms']>
      >[0];
    }
  >,
  newPrompt: string,
  bestArm: Awaited<
    ReturnType<UserDataStorageConnector['getSkillOptimizationArms']>
  >[0],
) {
  // Sort arms by performance (weighted mean reward, descending)
  const sortedArms = [...clusterArms].sort((a, b) => {
    const aStats = armStatsMap.get(a.id);
    const bStats = armStatsMap.get(b.id);
    return (bStats?.weighted_mean ?? 0) - (aStats?.weighted_mean ?? 0);
  });

  const bestArmStats = armStatsMap.get(bestArm.id);
  const updatePromises = [];

  for (let i = 0; i < sortedArms.length; i++) {
    const arm = sortedArms[i];
    const isBest = i === 0;
    const isWorst = i === sortedArms.length - 1;

    if (isBest) {
      // Best arm: Keep completely intact (no update)
      continue;
    }

    if (isWorst) {
      // Worst arm: Gets best config + new prompt
      updatePromises.push(
        userDataStorageConnector.updateSkillOptimizationArm(arm.id, {
          params: {
            ...bestArm.params,
            system_prompt: newPrompt,
          },
        }),
      );
      // Delete all arm_stats for this arm to reset its performance history
      updatePromises.push(
        userDataStorageConnector.deleteSkillOptimizationArmStats({
          arm_id: arm.id,
        }),
      );
    } else {
      // Middle arms: Get new prompt only
      updatePromises.push(
        userDataStorageConnector.updateSkillOptimizationArm(arm.id, {
          params: {
            ...arm.params,
            system_prompt: newPrompt,
          },
        }),
      );
      // Delete all arm_stats for this arm to reset its performance history
      updatePromises.push(
        userDataStorageConnector.deleteSkillOptimizationArmStats({
          arm_id: arm.id,
        }),
      );
    }
  }

  await Promise.all(updatePromises);

  // Reset cluster total_steps to match the best arm's request count
  await userDataStorageConnector.updateSkillOptimizationCluster(cluster.id, {
    total_steps: bestArmStats?.n ?? 0,
  });

  // Create skill event for reflection
  await userDataStorageConnector.createSkillEvent({
    agent_id: skill.agent_id,
    skill_id: skill.id,
    cluster_id: cluster.id,
    event_type: SkillEventType.REFLECTION,
    metadata: {},
  });

  // Emit SSE event for real-time updates
  emitSSEEvent('skill-optimization:event-created', {
    skillId: skill.id,
    clusterId: cluster.id,
    bestArmId: bestArm.id,
  });
}

/**
 * Converts a log into a conversation string with input, output, and request constraints
 */
export function generateExampleConversations(logs: Log[]): string[] {
  return logs
    .map((log) => {
      try {
        const raRequestData = produceReactiveAgentsRequestData(
          log.ai_provider_request_log.method,
          log.ai_provider_request_log.request_url,
          {},
          log.ai_provider_request_log.request_body,
        );
        const responseBody = ReactiveAgentsResponseBody.parse(
          log.ai_provider_request_log.response_body,
        );

        const messages = extractMessagesFromRequestData(
          raRequestData as
            | ChatCompletionRequestData
            | StreamChatCompletionRequestData
            | ResponsesRequestData,
        );
        const input = formatMessagesForExtraction(messages);
        const output = extractOutputFromResponseBody(responseBody);

        // Extract constraints from the AI provider's request body directly
        // This includes response_format with full JSON schema
        const constraints = extractRequestConstraints(
          log.ai_provider_request_log.request_body as
            | ChatCompletionRequestData
            | StreamChatCompletionRequestData
            | ResponsesRequestData,
        );

        return `${input}${constraints}\n\nAssistant: ${output}`;
      } catch (e) {
        error(
          `[REFLECTION] Failed to extract conversation from log ${log.id}:`,
          e,
        );
        return '';
      }
    })
    .filter((conversation) => conversation !== '');
}

/**
 * Converts logs into conversation strings with evaluation information appended
 */
async function generateExampleConversationsWithEvaluations(
  userDataStorageConnector: UserDataStorageConnector,
  logs: Log[],
): Promise<string[]> {
  const conversations: string[] = [];

  for (const log of logs) {
    try {
      const raRequestData = produceReactiveAgentsRequestData(
        log.ai_provider_request_log.method,
        log.ai_provider_request_log.request_url,
        {},
        log.ai_provider_request_log.request_body,
      );
      const responseBody = ReactiveAgentsResponseBody.parse(
        log.ai_provider_request_log.response_body,
      );

      const messages = extractMessagesFromRequestData(
        raRequestData as
          | ChatCompletionRequestData
          | StreamChatCompletionRequestData
          | ResponsesRequestData,
      );
      const input = formatMessagesForExtraction(messages);
      const output = extractOutputFromResponseBody(responseBody);

      const constraints = extractRequestConstraints(
        log.ai_provider_request_log.request_body as
          | ChatCompletionRequestData
          | StreamChatCompletionRequestData
          | ResponsesRequestData,
      );

      let conversation = `${input}${constraints}\n\nAssistant: ${output}`;

      // Fetch evaluation runs for this log
      const evaluationRuns =
        await userDataStorageConnector.getSkillOptimizationEvaluationRuns({
          log_id: log.id,
        });

      if (evaluationRuns.length > 0) {
        const evaluationRun = evaluationRuns[0];

        const evaluationInfo: string[] = [];

        for (const result of evaluationRun.results) {
          evaluationInfo.push(`\n## Evaluation: ${result.method}`);
          evaluationInfo.push(`Score: ${result.score.toFixed(2)}`);

          if (result.display_info && result.display_info.length > 0) {
            for (const displayItem of result.display_info) {
              evaluationInfo.push(
                `${displayItem.label}: ${displayItem.content}`,
              );
            }
          }
        }

        if (evaluationInfo.length > 0) {
          conversation += `\n\n---\n## Evaluation Results:${evaluationInfo.join('\n')}`;
        }
      }

      conversations.push(conversation);
    } catch (e) {
      error(
        `[REFLECTION] Failed to extract conversation with evaluations from log ${log.id}:`,
        e,
      );
    }
  }

  return conversations.filter((conversation) => conversation !== '');
}

async function autoGenerateSystemPromptsForCluster(
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  cluster: SkillOptimizationCluster,
  minRequestsPerArm: number,
  _numberOfSystemPrompts: number,
  skill: Skill,
  agentDescription: string,
) {
  // Attempt to acquire reflection lock
  const lockTime = await acquireReflectionLock(
    userDataStorageConnector,
    skill,
    cluster.id,
  );

  if (!lockTime) {
    return; // Lock acquisition failed, skip reflection
  }

  try {
    // Fetch cluster arms
    const clusterArms = await userDataStorageConnector.getSkillOptimizationArms(
      {
        skill_id: cluster.skill_id,
        cluster_id: cluster.id,
      },
    );

    // Early exit conditions
    if (clusterArms.length === 0) {
      console.warn(
        `[REFLECTION] No arms found for cluster ${cluster.id}. Skipping reflection and releasing lock.`,
      );
      await releaseReflectionLock(userDataStorageConnector, cluster.id);
      return;
    }

    if (clusterArms.length === 1) {
      await releaseReflectionLock(userDataStorageConnector, cluster.id);
      return;
    }

    // Calculate weighted stats for all arms
    const { armStatsMap, evaluationWeights } = await calculateClusterArmStats(
      userDataStorageConnector,
      cluster,
      clusterArms,
    );

    // Check threshold
    const thresholdMetArms = Array.from(armStatsMap.values()).every(
      (armData) => armData.n >= minRequestsPerArm,
    );
    if (!thresholdMetArms) {
      await releaseReflectionLock(userDataStorageConnector, cluster.id);
      return;
    }

    // Find best and worst performing arms
    let bestArm = clusterArms[0];
    let bestMean = -Infinity;
    let worstArm = clusterArms[0];
    let worstMean = Infinity;

    for (const [_armId, armData] of armStatsMap) {
      if (armData.weighted_mean > bestMean) {
        bestMean = armData.weighted_mean;
        bestArm = armData.arm;
      }
      if (armData.weighted_mean < worstMean) {
        worstMean = armData.weighted_mean;
        worstArm = armData.arm;
      }
    }

    // Fetch reflection examples (best and worst logs)
    const { bestExamples, worstExamples } = await fetchReflectionExamples(
      userDataStorageConnector,
      logsStorageConnector,
      cluster,
    );

    // SAFETY CHECK: Revalidate arms haven't changed during reflection
    const revalidatedArms =
      await userDataStorageConnector.getSkillOptimizationArms({
        skill_id: cluster.skill_id,
        cluster_id: cluster.id,
      });

    const revalidatedBestArm = revalidatedArms.find(
      (arm) => arm.id === bestArm.id,
    );
    const revalidatedWorstArm = revalidatedArms.find(
      (arm) => arm.id === worstArm.id,
    );

    // Re-fetch arm stats for revalidation
    const revalidatedArmStats =
      await userDataStorageConnector.getSkillOptimizationArmStats({
        cluster_id: cluster.id,
      });

    const revalidatedStatsGrouped = new Map<
      string,
      typeof revalidatedArmStats
    >();
    for (const stat of revalidatedArmStats) {
      const existing = revalidatedStatsGrouped.get(stat.arm_id) || [];
      existing.push(stat);
      revalidatedStatsGrouped.set(stat.arm_id, existing);
    }

    const calculateArmWeightedStats = (armId: string) => {
      const armStats = revalidatedStatsGrouped.get(armId) || [];
      let weightedMeanSum = 0;
      let totalWeight = 0;
      let totalRequests = 0;

      for (const stat of armStats) {
        const weight = evaluationWeights.get(stat.evaluation_id) || 1.0;
        weightedMeanSum += stat.mean * weight;
        totalWeight += weight;
        if (stat.n > totalRequests) {
          totalRequests = stat.n;
        }
      }

      return {
        n: totalRequests,
        weighted_mean: totalWeight > 0 ? weightedMeanSum / totalWeight : 0,
      };
    };

    const revalidatedBestStats = revalidatedBestArm
      ? calculateArmWeightedStats(revalidatedBestArm.id)
      : null;
    const revalidatedWorstStats = revalidatedWorstArm
      ? calculateArmWeightedStats(revalidatedWorstArm.id)
      : null;

    if (
      !revalidatedBestArm ||
      !revalidatedWorstArm ||
      !revalidatedBestStats ||
      !revalidatedWorstStats ||
      revalidatedBestStats.n < minRequestsPerArm ||
      revalidatedWorstStats.n < minRequestsPerArm
    ) {
      await releaseReflectionLock(userDataStorageConnector, cluster.id);
      return;
    }

    // Generate new prompt based on reflection

    const newPrompt = await generateReflectiveSystemPromptForSkill(
      bestArm.params.system_prompt,
      bestExamples,
      worstExamples,
      agentDescription,
      skill.description,
      skill.allowed_template_variables,
      userDataStorageConnector,
    );

    // Perform reflection: update arms with new prompt and reset stats
    await performReflection(
      userDataStorageConnector,
      cluster,
      skill,
      clusterArms,
      armStatsMap,
      newPrompt,
      bestArm,
    );

    // Release lock on successful completion
    await releaseReflectionLock(userDataStorageConnector, cluster.id);
  } catch (reflectionError) {
    console.error(
      `[REFLECTION] Error during reflection for skill ${skill.id}, cluster ${cluster.id}:`,
      reflectionError,
    );
    // Release lock on error
    try {
      await releaseReflectionLock(userDataStorageConnector, cluster.id);
    } catch (unlockError) {
      console.error('[REFLECTION] Failed to release lock:', unlockError);
    }
    // Re-throw to allow caller to handle
    throw reflectionError;
  }
}

export async function autoGenerateSystemPromptsForSkill(
  functionName: FunctionName,
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  skill: Skill,
) {
  // Only attempt to optimize for specific endpoints
  if (
    !(
      functionName === FunctionName.CHAT_COMPLETE ||
      functionName === FunctionName.STREAM_CHAT_COMPLETE ||
      functionName === FunctionName.CREATE_MODEL_RESPONSE
    )
  ) {
    return;
  }

  const skillClusters =
    await userDataStorageConnector.getSkillOptimizationClusters({
      skill_id: skill.id,
    });

  if (!skillClusters) {
    throw new Error('Skill clusters not found');
  }

  const minRequestsPerArm = skill.reflection_min_requests_per_arm;

  // Fetch the agent information for context
  const agents = await userDataStorageConnector.getAgents({
    id: skill.agent_id,
  });

  if (agents.length === 0) {
    throw new Error(`Agent with id ${skill.agent_id} not found`);
  }

  const agent = agents[0];

  for (const cluster of skillClusters) {
    await autoGenerateSystemPromptsForCluster(
      userDataStorageConnector,
      logsStorageConnector,
      cluster,
      minRequestsPerArm,
      1, // Always use 1 system prompt
      skill,
      agent.description,
    );
  }
}
