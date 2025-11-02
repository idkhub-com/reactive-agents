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
  // Calculate average score from all evaluations (normalized 0-1)
  const scores = evaluationResults.map((result) => result.score);

  const reward = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  await updateArmStats(userDataStorageConnector, arm, reward);
}

export async function updateArmStats(
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

  // Emit SSE event for arm updates
  emitSSEEvent('skill-optimization:arm-updated', {
    armId: arm.id,
    skillId: arm.skill_id,
    clusterId: arm.cluster_id,
  });
}
