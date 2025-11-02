import type { UserDataStorageConnector } from '@server/types/connector';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import type {
  SkillOptimizationArm,
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
