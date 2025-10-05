import { generateEvaluationsCreateParamsListForSkill } from '@server/optimization/utils/evaluations';
import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';

export async function handleGenerateEvaluations(
  c: AppContext,
  userStorageConnector: UserDataStorageConnector,
  connectors: Record<EvaluationMethodName, EvaluationMethodConnector>,
  skillId: string,
) {
  const skills = await userStorageConnector.getSkills({
    id: skillId,
  });

  if (skills.length === 0) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const skill = skills[0];

  // Remove all current evaluations for the skill
  await userStorageConnector.deleteSkillOptimizationEvaluationsForSkill(
    skill.id,
  );

  const evaluationsCreateParamsList =
    await generateEvaluationsCreateParamsListForSkill(skill, connectors);

  const createdArms =
    await userStorageConnector.createSkillOptimizationEvaluations(
      evaluationsCreateParamsList,
    );

  return c.json({ createdArms }, 200);
}
