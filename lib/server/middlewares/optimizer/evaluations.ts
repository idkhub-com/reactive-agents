import { generateExampleConversations } from '@server/middlewares/optimizer/system-prompt';
import { regenerateEvaluationsWithExamples } from '@server/optimization/utils/evaluations';
import { generateSeedSystemPromptWithContext } from '@server/optimization/utils/system-prompt';
import type {
  EvaluationMethodConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import { FunctionName } from '@shared/types/api/request';
import type {
  Skill,
  SkillOptimizationArm,
  SkillOptimizationArmCreateParams,
  SkillOptimizationEvaluationResult,
  SkillOptimizationEvaluationRunCreateParams,
} from '@shared/types/data';

export async function addSkillOptimizationEvaluationRun(
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

  const evaluationRun =
    await userDataStorageConnector.createSkillOptimizationEvaluationRun(
      createParams,
    );

  // Emit SSE event for evaluation run creation
  emitSSEEvent('skill-optimization:evaluation-run-created', {
    evaluationRunId: evaluationRun.id,
    skillId: arm.skill_id,
    clusterId: arm.cluster_id,
  });
}

/**
 * Checks if we should regenerate evaluations with real examples.
 * This happens after the first 5 requests to ensure evaluations align with actual usage.
 * After that, evaluations are regenerated during system prompt reflection.
 */
export async function checkAndRegenerateEvaluationsEarly(
  functionName: FunctionName,
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  skill: Skill,
  agentDescription: string,
  evaluationConnectorsMap: Record<string, EvaluationMethodConnector>,
): Promise<void> {
  try {
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

    // Re-fetch skill to get latest metadata state (critical for lock check)
    // This ensures we see any locks or completion flags set by concurrent requests
    const latestSkills = await userDataStorageConnector.getSkills({
      id: skill.id,
    });

    if (latestSkills.length === 0) {
      console.log(`[EARLY_EVAL_REGEN] Skill ${skill.id} not found, skipping`);
      return;
    }

    const latestSkill = latestSkills[0];

    // Check if skill has evaluations_regenerated_at set
    const hasRegeneratedEvaluations =
      latestSkill.evaluations_regenerated_at !== null;

    if (hasRegeneratedEvaluations) {
      // Already regenerated once, skip
      return;
    }

    // Check if regeneration lock exists and is recent (< 5 minutes old)
    const lockTimestamp = latestSkill.evaluation_lock_acquired_at;
    if (lockTimestamp) {
      const lockAge = Date.now() - new Date(lockTimestamp).getTime();
      const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

      if (lockAge < LOCK_TIMEOUT_MS) {
        console.log(
          `[EARLY_EVAL_REGEN] Regeneration already in progress for skill ${skill.id} (locked ${Math.round(lockAge / 1000)}s ago), skipping`,
        );
        return;
      }
      console.log(
        `[EARLY_EVAL_REGEN] Lock for skill ${skill.id} is stale (${Math.round(lockAge / 1000)}s old), proceeding`,
      );
    }

    // Try to acquire lock by updating the skill
    const lockTime = new Date().toISOString();
    try {
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: lockTime,
      });
      console.log(`[EARLY_EVAL_REGEN] Acquired lock for skill ${skill.id}`);
    } catch (_error) {
      console.log(
        `[EARLY_EVAL_REGEN] Failed to acquire lock for skill ${skill.id}, another worker may have it`,
      );
      return;
    }

    // CRITICAL: Double-check the lock after acquisition to detect race conditions
    // Re-fetch the skill and verify:
    // 1. The lock we just set is still there (not overwritten by another process)
    // 2. No completion flag has been set (another process didn't complete while we were setting the lock)
    const postLockSkills = await userDataStorageConnector.getSkills({
      id: skill.id,
    });

    if (postLockSkills.length === 0) {
      console.log(
        `[EARLY_EVAL_REGEN] Skill ${skill.id} disappeared after lock, aborting`,
      );
      return;
    }

    const postLockSkill = postLockSkills[0];

    // Check if completion flag was set by another process
    if (postLockSkill.evaluations_regenerated_at !== null) {
      console.log(
        `[EARLY_EVAL_REGEN] Skill ${skill.id} was completed by another process, releasing lock and aborting`,
      );
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: null,
      });
      return;
    }

    // Check if our lock is still there (not overwritten by another process)
    // Compare as Date objects to handle different ISO string formats (Z vs +00:00)
    const postLockTime = postLockSkill.evaluation_lock_acquired_at
      ? new Date(postLockSkill.evaluation_lock_acquired_at).getTime()
      : null;
    const expectedLockTime = new Date(lockTime).getTime();

    if (postLockTime !== expectedLockTime) {
      console.log(
        `[EARLY_EVAL_REGEN] Lock for skill ${skill.id} was overwritten by another process (expected: ${lockTime}, got: ${postLockSkill.evaluation_lock_acquired_at}), aborting`,
      );
      return;
    }

    console.log(
      `[EARLY_EVAL_REGEN] Lock verified for skill ${skill.id}, proceeding with regeneration`,
    );

    // Count total logs for this skill
    const logs = await logsStorageConnector.getLogs({
      skill_id: skill.id,
      embedding_not_null: true,
      limit: 10, // Get a few more than needed
    });

    console.log(
      `[EARLY_EVAL_REGEN] Skill ${skill.id}: Found ${logs.length} logs (need 5)`,
    );

    // Need at least 5 logs to regenerate
    if (logs.length < 5) {
      // Release lock
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: null,
      });
      return;
    }

    const exampleLogs = logs.slice(0, 5); // Use first 5 logs
    const examples = generateExampleConversations(exampleLogs);

    console.log(
      `[EARLY_EVAL_REGEN] Generated ${examples.length} examples from logs`,
    );

    if (examples.length === 0) {
      console.log('[EARLY_EVAL_REGEN] No examples generated, skipping');
      // Release lock
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: null,
      });
      return;
    }

    // Get existing evaluations
    const existingEvaluations =
      await userDataStorageConnector.getSkillOptimizationEvaluations({
        skill_id: skill.id,
      });

    console.log(
      `[EARLY_EVAL_REGEN] Found ${existingEvaluations?.length || 0} existing evaluations`,
    );

    if (!existingEvaluations || existingEvaluations.length === 0) {
      console.log('[EARLY_EVAL_REGEN] No existing evaluations, skipping');
      // Release lock
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: null,
      });
      return;
    }

    const evaluationMethods = existingEvaluations.map(
      (e) => e.evaluation_method,
    );

    console.log(
      `[EARLY_EVAL_REGEN] Regenerating evaluations and system prompts in parallel`,
    );

    // Extract response format from the first log that has one (needed for system prompt)
    let responseFormat: unknown;
    for (const log of exampleLogs) {
      const requestBody = log.ai_provider_request_log.request_body;
      if ('response_format' in requestBody && requestBody.response_format) {
        responseFormat = requestBody.response_format;
        break;
      }
    }

    // Run evaluation regeneration and system prompt generation in parallel
    const [newEvaluationParams, newSystemPrompt] = await Promise.all([
      // Regenerate evaluations with real examples
      (async () => {
        console.log(
          `[EARLY_EVAL_REGEN] Regenerating evaluations: ${evaluationMethods.join(', ')}`,
        );
        const params = await regenerateEvaluationsWithExamples(
          skill,
          agentDescription,
          examples,
          evaluationConnectorsMap,
          evaluationMethods,
        );
        console.log('[EARLY_EVAL_REGEN] Successfully regenerated evaluations');
        return params;
      })(),

      // Generate new system prompt with schema and examples
      (async () => {
        console.log(
          '[EARLY_EVAL_REGEN] Regenerating system prompts with context',
        );
        console.log(
          `[EARLY_EVAL_REGEN] Response format found: ${responseFormat !== undefined}`,
        );
        console.log(
          `[EARLY_EVAL_REGEN] Input to generateSeedSystemPromptWithContext:`,
        );
        console.log(`  Agent description: ${agentDescription}`);
        console.log(`  Skill description: ${skill.description}`);
        console.log(`  Number of examples: ${examples.length}`);
        console.log(
          `  Response format present: ${responseFormat !== undefined}`,
        );
        if (responseFormat) {
          console.log(
            `  Response format: ${JSON.stringify(responseFormat, null, 2)}`,
          );
        }
        console.log(`  Examples:`);
        for (let i = 0; i < examples.length; i++) {
          console.log(`    Example ${i + 1}:`);
          console.log(examples[i]);
        }

        const prompt = await generateSeedSystemPromptWithContext(
          agentDescription,
          skill.description,
          examples,
          responseFormat,
        );
        console.log('[EARLY_EVAL_REGEN] Generated new system prompt:');
        console.log(`${prompt.substring(0, 300)}...`);
        return prompt;
      })(),
    ]);

    // Delete old evaluations and create new ones
    await userDataStorageConnector.deleteSkillOptimizationEvaluationsForSkill(
      skill.id,
    );
    await userDataStorageConnector.createSkillOptimizationEvaluations(
      newEvaluationParams,
    );

    console.log(
      '[EARLY_EVAL_REGEN] Both evaluations and system prompt completed',
    );

    // Delete all old arms and recreate with new system prompts
    const allArms = await userDataStorageConnector.getSkillOptimizationArms({
      skill_id: skill.id,
    });

    console.log(
      `[EARLY_EVAL_REGEN] Recreating ${allArms.length} arms with new system prompt`,
    );

    // Create new arms with the same system prompt and fresh stats
    const newArmParams: SkillOptimizationArmCreateParams[] = allArms.map(
      (arm) => {
        return {
          agent_id: arm.agent_id,
          skill_id: arm.skill_id,
          cluster_id: arm.cluster_id,
          name: arm.name,
          params: {
            ...arm.params,
            system_prompt: newSystemPrompt,
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

    // Delete all old arms for this skill
    await userDataStorageConnector.deleteSkillOptimizationArmsForSkill(
      skill.id,
    );

    // Create new arms
    await userDataStorageConnector.createSkillOptimizationArms(newArmParams);

    console.log(
      '[EARLY_EVAL_REGEN] Successfully recreated all arms with new system prompts',
    );

    // Mark completion and release lock atomically
    console.log('[EARLY_EVAL_REGEN] Updating skill with completion timestamp');
    try {
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluations_regenerated_at: new Date().toISOString(),
        evaluation_lock_acquired_at: null, // Release lock
      });
      console.log(
        '[EARLY_EVAL_REGEN] Successfully marked regeneration as complete',
      );
    } catch (updateError) {
      console.error('[EARLY_EVAL_REGEN] Failed to update skill:', updateError);
      throw updateError; // Re-throw to be caught by outer catch
    }

    // Reset all cluster total_steps to 0 since we're doing a soft reset
    // IMPORTANT: This happens AFTER marking completion to avoid race conditions
    // where concurrent requests increment total_steps during the regeneration process
    const allClusters =
      await userDataStorageConnector.getSkillOptimizationClusters({
        skill_id: skill.id,
      });

    console.log(
      `[EARLY_EVAL_REGEN] Resetting total_steps for ${allClusters.length} clusters`,
    );

    for (const cluster of allClusters) {
      await userDataStorageConnector.updateSkillOptimizationCluster(
        cluster.id,
        {
          total_steps: 0,
        },
      );
    }

    console.log('[EARLY_EVAL_REGEN] Successfully reset all cluster stats');

    // Emit SSE event
    emitSSEEvent('skill-optimization:evaluations-regenerated', {
      skillId: skill.id,
      reason: 'early-regeneration',
      exampleCount: examples.length,
    });

    console.log('[EARLY_EVAL_REGEN] Process completed successfully');
  } catch (error) {
    console.error('[EARLY_EVAL_REGEN] Error during regeneration:', error);
    // Release lock on error
    try {
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: null,
      });
    } catch (unlockError) {
      console.error('[EARLY_EVAL_REGEN] Failed to release lock:', unlockError);
    }
    // Don't throw - we don't want to break the request flow
  }
}
