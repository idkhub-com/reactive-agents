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
  SkillOptimizationEvaluationResult,
  SkillOptimizationEvaluationRunCreateParams,
} from '@shared/types/data';
import { SkillEventType } from '@shared/types/data/skill-event';

export async function addSkillOptimizationEvaluationRun(
  userDataStorageConnector: UserDataStorageConnector,
  arm: SkillOptimizationArm,
  logId: string,
  evaluationResults: SkillOptimizationEvaluationResult[],
) {
  const createParams: SkillOptimizationEvaluationRunCreateParams = {
    agent_id: arm.agent_id,
    skill_id: arm.skill_id,
    cluster_id: arm.cluster_id,
    log_id: logId,
    results: evaluationResults,
  };

  const evaluationRun =
    await userDataStorageConnector.createSkillOptimizationEvaluationRun(
      createParams,
    );

  // Emit SSE event for evaluation run creation with full evaluation data
  emitSSEEvent('skill-optimization:evaluation-run-created', {
    evaluationRun: evaluationRun,
    agentId: arm.agent_id,
    skillId: arm.skill_id,
    clusterId: arm.cluster_id,
    logId: logId,
  });
}

/**
 * Checks if we should regenerate system prompts and evaluations with real examples.
 * This happens after the first 5 requests to use actual usage data.
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
        return;
      }
    }

    // Try to acquire lock by updating the skill
    const lockTime = new Date().toISOString();
    try {
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: lockTime,
      });
    } catch (_error) {
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
      return;
    }

    const postLockSkill = postLockSkills[0];

    // Check if completion flag was set by another process
    if (postLockSkill.evaluations_regenerated_at !== null) {
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
      return;
    }

    // Count total logs for this skill
    const logs = await logsStorageConnector.getLogs({
      skill_id: skill.id,
      embedding_not_null: true,
      limit: 10, // Get a few more than needed
    });

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

    if (examples.length === 0) {
      // Release lock
      await userDataStorageConnector.updateSkill(skill.id, {
        evaluation_lock_acquired_at: null,
      });
      return;
    }

    // Extract response format from the first log that has one (needed for system prompt)
    let responseFormat: unknown;
    for (const log of exampleLogs) {
      const requestBody = log.ai_provider_request_log.request_body;
      if ('response_format' in requestBody && requestBody.response_format) {
        responseFormat = requestBody.response_format;
        break;
      }
    }

    // Generate new system prompt with schema and examples
    const newSystemPrompt = await generateSeedSystemPromptWithContext(
      agentDescription,
      skill.description,
      examples,
      userDataStorageConnector,
      responseFormat,
      skill.allowed_template_variables,
    );

    // Get existing evaluations to know which methods to regenerate
    const existingEvaluations =
      await userDataStorageConnector.getSkillOptimizationEvaluations({
        skill_id: skill.id,
      });
    const existingEvaluationMethods = existingEvaluations.map(
      (e) => e.evaluation_method,
    );

    // Regenerate evaluations with real examples
    const newEvaluationParams = await regenerateEvaluationsWithExamples(
      skill,
      agentDescription,
      examples,
      evaluationConnectorsMap,
      existingEvaluationMethods,
      userDataStorageConnector,
    );

    // Update evaluations in-place to preserve their IDs and relationships
    // Match evaluations by method to ensure correct updates
    for (const evaluation of existingEvaluations) {
      const newParams = newEvaluationParams.find(
        (p) => p.evaluation_method === evaluation.evaluation_method,
      );

      if (newParams) {
        await userDataStorageConnector.updateSkillOptimizationEvaluation(
          evaluation.id,
          {
            params: newParams.params,
            weight: newParams.weight,
          },
        );
      }
    }

    // Update all arms in-place with new system prompts
    // This preserves arm IDs and cluster associations
    const allArms = await userDataStorageConnector.getSkillOptimizationArms({
      skill_id: skill.id,
    });

    for (const arm of allArms) {
      await userDataStorageConnector.updateSkillOptimizationArm(arm.id, {
        params: {
          ...arm.params,
          system_prompt: newSystemPrompt,
        },
      });
    }

    // Reset all arm stats since we have new evaluations and system prompts
    // This forces Thompson Sampling to re-explore with the new configurations
    for (const arm of allArms) {
      await userDataStorageConnector.deleteSkillOptimizationArmStats({
        arm_id: arm.id,
      });
    }

    // Reset all cluster total_steps to 0 for early regeneration
    // This restarts the exploration/exploitation balance
    const allClusters =
      await userDataStorageConnector.getSkillOptimizationClusters({
        skill_id: skill.id,
      });

    for (const cluster of allClusters) {
      await userDataStorageConnector.updateSkillOptimizationCluster(
        cluster.id,
        {
          total_steps: 0,
        },
      );
    }

    // Mark completion and release lock atomically
    await userDataStorageConnector.updateSkill(skill.id, {
      evaluations_regenerated_at: new Date().toISOString(),
      evaluation_lock_acquired_at: null, // Release lock
    });

    // Create event for context generation
    await userDataStorageConnector.createSkillEvent({
      agent_id: skill.agent_id,
      skill_id: skill.id,
      cluster_id: null, // Skill-wide event
      event_type: SkillEventType.CONTEXT_GENERATED,
      metadata: {
        log_count: exampleLogs.length,
      },
    });

    // Emit SSE event
    emitSSEEvent('skill-optimization:evaluations-regenerated', {
      skillId: skill.id,
      reason: 'early-regeneration',
      exampleCount: examples.length,
    });
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
