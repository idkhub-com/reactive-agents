import type { UserDataStorageConnector } from '@server/types/connector';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import type {
  SkillOptimizationArm,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';

export async function updatePulledArm(
  userDataStorageConnector: UserDataStorageConnector,
  arm: SkillOptimizationArm,
  evaluationResults: SkillOptimizationEvaluationResult[],
) {
  // Extract evaluation_id and score pairs for atomic update
  const evaluationScores = evaluationResults.map((result) => ({
    evaluation_id: result.evaluation_id,
    score: result.score,
  }));

  await updateArmStats(userDataStorageConnector, arm, evaluationScores);
}

export async function updateArmStats(
  userDataStorageConnector: UserDataStorageConnector,
  arm: SkillOptimizationArm,
  evaluationResults: Array<{ evaluation_id: string; score: number }>,
) {
  // Atomically update arm stats for each evaluation AND increment cluster/skill counters
  // PostgreSQL calculates new stats (n, mean, n2, total_reward) per evaluation internally
  // This ensures proper tracking of each evaluation method's performance
  const result = await userDataStorageConnector.updateArmAndIncrementCounters(
    arm.id,
    evaluationResults,
  );

  // Emit SSE event with all updated data (arm, cluster, skill)
  emitSSEEvent('skill-optimization:arm-updated', {
    arm: result.arm,
    cluster: result.cluster,
    skill: result.skill,
  });
}
