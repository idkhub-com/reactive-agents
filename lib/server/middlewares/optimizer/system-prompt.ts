import { generateReflectiveSystemPromptForSkill } from '@server/optimization/utils/system-prompt';
import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { formatMessagesForExtraction } from '@server/utils/messages';
import { extractMessagesFromRequestData } from '@server/utils/reactive-agents/requests';
import { extractOutputFromResponseBody } from '@server/utils/reactive-agents/responses';
import { debug, error } from '@shared/console-logging';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type {
  Log,
  Skill,
  SkillOptimizationArmCreateParams,
  SkillOptimizationCluster,
} from '@shared/types/data';
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

async function autoGenerateSystemPromptsForCluster(
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  cluster: SkillOptimizationCluster,
  minRequestsPerArm: number,
  _numberOfSystemPrompts: number,
  skill: Skill,
  agentDescription: string,
) {
  // Re-fetch skill to get latest metadata state (critical for lock check)
  // This ensures we see any locks set by concurrent requests
  const latestSkills = await userDataStorageConnector.getSkills({
    id: skill.id,
  });

  if (latestSkills.length === 0) {
    console.log(
      `[REFLECTION] Skill ${skill.id} not found for cluster ${cluster.id}, skipping`,
    );
    return;
  }

  const latestSkill = latestSkills[0];

  // Check if reflection lock exists and is recent (< 10 minutes old)
  const lockTimestamp = latestSkill.reflection_lock_acquired_at;
  if (lockTimestamp) {
    const lockAge = Date.now() - new Date(lockTimestamp).getTime();
    const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    if (lockAge < LOCK_TIMEOUT_MS) {
      console.log(
        `[REFLECTION] Reflection already in progress for skill ${skill.id}, cluster ${cluster.id} (locked ${Math.round(lockAge / 1000)}s ago), skipping`,
      );
      return;
    }
    console.log(
      `[REFLECTION] Lock for skill ${skill.id} is stale (${Math.round(lockAge / 1000)}s old), proceeding`,
    );
  }

  // Try to acquire lock by updating the skill
  const lockTime = new Date().toISOString();
  try {
    await userDataStorageConnector.updateSkill(skill.id, {
      reflection_lock_acquired_at: lockTime,
    });
    console.log(
      `[REFLECTION] Acquired lock for skill ${skill.id}, cluster ${cluster.id}`,
    );
  } catch (_error) {
    console.log(
      `[REFLECTION] Failed to acquire lock for skill ${skill.id}, cluster ${cluster.id}, another worker may have it`,
    );
    return;
  }

  // CRITICAL: Double-check the lock after acquisition to detect race conditions
  // Re-fetch the skill and verify our exact lock timestamp is still there
  const postLockSkills = await userDataStorageConnector.getSkills({
    id: skill.id,
  });

  if (postLockSkills.length === 0) {
    console.log(
      `[REFLECTION] Skill ${skill.id} disappeared after lock, aborting`,
    );
    return;
  }

  const postLockSkill = postLockSkills[0];

  // Check if our lock is still there (not overwritten by another process)
  // Compare as Date objects to handle different ISO string formats (Z vs +00:00)
  const postLockTime = postLockSkill.reflection_lock_acquired_at
    ? new Date(postLockSkill.reflection_lock_acquired_at).getTime()
    : null;
  const expectedLockTime = new Date(lockTime).getTime();

  if (postLockTime !== expectedLockTime) {
    console.log(
      `[REFLECTION] Lock for skill ${skill.id}, cluster ${cluster.id} was overwritten by another process (expected: ${lockTime}, got: ${postLockSkill.reflection_lock_acquired_at}), aborting`,
    );
    return;
  }

  console.log(
    `[REFLECTION] Lock verified for skill ${skill.id}, cluster ${cluster.id}, proceeding with reflection`,
  );

  try {
    const clusterArms = await userDataStorageConnector.getSkillOptimizationArms(
      {
        skill_id: cluster.skill_id,
        cluster_id: cluster.id,
      },
    );

    debug('clusterArms Len', clusterArms.length);

    if (clusterArms.length === 0) {
      throw new Error(`No arms found for cluster ${cluster.id}`);
    }

    // We have already optimized this cluster as much as possible
    if (clusterArms.length === 1) {
      // Release lock before returning
      await userDataStorageConnector.updateSkill(skill.id, {
        reflection_lock_acquired_at: null,
      });
      return;
    }

    // Check that all arms have been used at least minRequestsPerArm times
    const armUsageCounts = clusterArms.reduce(
      (acc, arm) => {
        acc[arm.id] = arm.stats.n;
        return acc;
      },
      {} as Record<string, number>,
    );

    debug('Arms usage', armUsageCounts);

    const thresholdMetArms = Object.values(armUsageCounts).every(
      (count) => count >= minRequestsPerArm,
    );

    // Minimum number of requests per arm not yet met for all arms
    if (!thresholdMetArms) {
      console.log(
        `[REFLECTION] Not all arms have met threshold (${minRequestsPerArm} requests) for cluster ${cluster.id}`,
      );
      // Release lock before returning
      await userDataStorageConnector.updateSkill(skill.id, {
        reflection_lock_acquired_at: null,
      });
      return;
    }

    const logExampleCount = 7;
    const logs = await logsStorageConnector.getLogs({
      skill_id: cluster.skill_id,
      cluster_id: cluster.id,
      // Since the embedding is not null, we can assume that the logs are valid
      // and are for one of the allowed function names
      embedding_not_null: true,
      limit: logExampleCount,
    });

    const examplesConversations = generateExampleConversations(logs);

    // Find best and worst performing arms
    const bestArm = clusterArms.reduce((best, current) => {
      return current.stats.mean > best.stats.mean ? current : best;
    });

    const worstArm = clusterArms.reduce((worst, current) => {
      return current.stats.mean < worst.stats.mean ? current : worst;
    });

    // SAFETY CHECK: Re-fetch arms and verify best/worst still have sufficient requests
    // This prevents race conditions where arms were updated during reflection
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

    // Verify arms still exist and have sufficient requests
    if (!revalidatedBestArm || !revalidatedWorstArm) {
      console.log(
        `[REFLECTION] Best or worst arm no longer exists for cluster ${cluster.id}, race condition detected. Aborting.`,
      );
      // Release lock before returning
      await userDataStorageConnector.updateSkill(skill.id, {
        reflection_lock_acquired_at: null,
      });
      return;
    }

    // Verify both arms still have sufficient requests
    if (
      revalidatedBestArm.stats.n < minRequestsPerArm ||
      revalidatedWorstArm.stats.n < minRequestsPerArm
    ) {
      console.log(
        `[REFLECTION] Best or worst arm no longer has sufficient requests (need ${minRequestsPerArm}). Best: ${revalidatedBestArm.stats.n}, Worst: ${revalidatedWorstArm.stats.n}. Race condition detected. Aborting.`,
      );
      // Release lock before returning
      await userDataStorageConnector.updateSkill(skill.id, {
        reflection_lock_acquired_at: null,
      });
      return;
    }

    console.log(
      `[REFLECTION] Safety checks passed for cluster ${cluster.id}. Best arm: ${bestArm.id} (${revalidatedBestArm.stats.n} requests), Worst arm: ${worstArm.id} (${revalidatedWorstArm.stats.n} requests)`,
    );

    // Sort arms by performance (mean reward, descending)
    const sortedArms = [...clusterArms].sort(
      (a, b) => b.stats.mean - a.stats.mean,
    );

    // Remove the worst performing arm to reduce search space over time
    const armsToKeep = sortedArms.slice(0, -1); // Remove last (worst) arm
    const worstArmRemoved = sortedArms[sortedArms.length - 1];

    console.log(
      `[REFLECTION] Removing worst arm: ${worstArmRemoved.id} (mean: ${worstArmRemoved.stats.mean})`,
    );
    console.log(
      `[REFLECTION] Arms count: ${sortedArms.length} -> ${armsToKeep.length}`,
    );

    // Keep top 50% of remaining arms
    const halfPoint = Math.ceil(armsToKeep.length / 2);
    const topHalfArms = armsToKeep.slice(0, halfPoint);
    const bottomHalfCount = armsToKeep.length - halfPoint;

    console.log(
      `[REFLECTION] Keeping top ${topHalfArms.length} arm prompts, generating ${bottomHalfCount} new reflected prompts`,
    );

    // Extract unique system prompts from top performers (memory efficient - just the prompts)
    const topPrompts = Array.from(
      new Set(topHalfArms.map((arm) => arm.params.system_prompt)),
    );

    console.log(
      `[REFLECTION] Found ${topPrompts.length} unique system prompts in top performers`,
    );

    // Generate new reflected prompts to replace bottom half
    console.log(
      `[REFLECTION] Generating ${bottomHalfCount} new system prompts using reflection`,
    );
    console.log(`[REFLECTION] Input data:`);
    console.log(`  Agent description: ${agentDescription}`);
    console.log(`  Skill description: ${skill.description}`);
    console.log(
      `  Number of example conversations: ${examplesConversations.length}`,
    );
    console.log(`  Example conversations (first 3):`);
    for (let i = 0; i < Math.min(3, examplesConversations.length); i++) {
      console.log(`    Example ${i + 1}:`);
      console.log(examplesConversations[i]);
    }
    console.log(
      `  Best arm system prompt: ${bestArm.params.system_prompt.substring(0, 300)}...`,
    );

    const reflectedPromptPromises = [];
    for (let i = 0; i < bottomHalfCount; i++) {
      reflectedPromptPromises.push(
        generateReflectiveSystemPromptForSkill(
          bestArm.params.system_prompt,
          examplesConversations,
          agentDescription,
          skill.description,
        ),
      );
    }

    const reflectedPrompts = await Promise.all(reflectedPromptPromises);
    console.log(
      `[REFLECTION] Generated ${reflectedPrompts.length} new reflected prompts`,
    );
    for (let i = 0; i < reflectedPrompts.length; i++) {
      console.log(
        `[REFLECTION] New reflected prompt ${i + 1}: ${reflectedPrompts[i].substring(0, 300)}...`,
      );
    }

    // Combine top prompts with new reflected prompts
    const allPrompts = [...topPrompts, ...reflectedPrompts];
    console.log(
      `[REFLECTION] Total prompt pool: ${allPrompts.length} prompts (${topPrompts.length} kept + ${reflectedPrompts.length} new)`,
    );

    // Shuffle the combined pool for random assignment
    // Fisher-Yates shuffle (memory efficient - in-place)
    for (let i = allPrompts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPrompts[i], allPrompts[j]] = [allPrompts[j], allPrompts[i]];
    }

    console.log('[REFLECTION] Shuffled prompt pool for random assignment');

    // Create new arms with randomly assigned prompts from the pool
    // Note: Using armsToKeep (which excludes the worst arm)
    const createParamsList: SkillOptimizationArmCreateParams[] = armsToKeep.map(
      (arm, index) => {
        const promptIndex = index % allPrompts.length;
        const assignedPrompt = allPrompts[promptIndex];

        return {
          agent_id: arm.agent_id,
          skill_id: arm.skill_id,
          cluster_id: arm.cluster_id,
          name: arm.name,
          params: {
            ...arm.params,
            system_prompt: assignedPrompt,
          },
          stats: {
            n: 0,
            mean: 0,
            n2: 0,
            total_reward: 0,
          },
        };
      },
    );

    // Delete old arms for this cluster only
    console.log(
      `[REFLECTION] Deleting all ${sortedArms.length} old arms for cluster ${cluster.id}`,
    );
    await userDataStorageConnector.deleteSkillOptimizationArmsForCluster(
      cluster.id,
    );

    console.log(
      `[REFLECTION] Creating ${createParamsList.length} new arms for cluster ${cluster.id}`,
    );
    await userDataStorageConnector.createSkillOptimizationArms(
      createParamsList,
    );
    console.log('[REFLECTION] Successfully recreated arms with new prompts');

    // Fetch latest cluster data and reset total_steps to 0
    // We do this AFTER creating new arms so the reset happens immediately
    // This prevents the counter from accumulating during the long LLM calls above
    const latestClusters =
      await userDataStorageConnector.getSkillOptimizationClusters({
        id: cluster.id,
      });
    if (latestClusters.length === 0) {
      throw new Error(`Cluster ${cluster.id} not found during reset`);
    }
    const latestCluster = latestClusters[0];

    console.log(
      `[REFLECTION] Resetting cluster ${cluster.id} total_steps from ${latestCluster.total_steps} to 0`,
    );

    await userDataStorageConnector.updateSkillOptimizationCluster(cluster.id, {
      total_steps: 0,
    });

    console.log(
      `[REFLECTION] Successfully completed reflection for cluster ${cluster.id}`,
    );

    // Release lock on successful completion
    await userDataStorageConnector.updateSkill(skill.id, {
      reflection_lock_acquired_at: null,
    });
  } catch (reflectionError) {
    console.error(
      `[REFLECTION] Error during reflection for skill ${skill.id}, cluster ${cluster.id}:`,
      reflectionError,
    );
    // Release lock on error
    try {
      await userDataStorageConnector.updateSkill(skill.id, {
        reflection_lock_acquired_at: null,
      });
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
