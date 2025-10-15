import type { UserDataStorageConnector } from '@server/types/connector';
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

  await userDataStorageConnector.createSkillOptimizationEvaluationRun(
    createParams,
  );
}
