import { BaseArmsParams } from '@server/handlers/idkhub/base-arms';
import { generateSystemPromptForSkill } from '@server/handlers/idkhub/system-prompt';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import type {
  SkillOptimizationArmCreateParams,
  SkillOptimizationArmParams,
  SkillOptimizationArmStats,
} from '@shared/types/data/skill-optimization-arm';

export async function handleGenerateArms(
  c: AppContext,
  userStorageConnector: UserDataStorageConnector,
  skillId: string,
) {
  const skills = await userStorageConnector.getSkills({
    id: skillId,
  });

  if (skills.length === 0) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const skill = skills[0];

  const numberOfSystemPrompts = 3;

  const systemPrompts = [];
  for (let i = 0; i < numberOfSystemPrompts; i++) {
    const systemPrompt = await generateSystemPromptForSkill(skill);
    systemPrompts.push(systemPrompt);
  }

  const skillModels = await userStorageConnector.getSkillModels(skillId);

  const createParamsList: SkillOptimizationArmCreateParams[] = [];

  for (const model of skillModels) {
    for (const systemPrompt of systemPrompts) {
      for (const baseArm of BaseArmsParams) {
        const armParams: SkillOptimizationArmParams = {
          ...baseArm,
          model_id: model.id,
          system_prompt: systemPrompt,
        };
        const stats: SkillOptimizationArmStats = {
          n: 0n,
          mean: 0,
          n2: 0n,
          total_reward: 0n,
        };
        const createParams: SkillOptimizationArmCreateParams = {
          agent_id: skill.agent_id,
          skill_id: skill.id,
          params: armParams,
          stats: stats,
        };
        createParamsList.push(createParams);
      }
    }
  }

  const createdArms =
    await userStorageConnector.createSkillOptimizationArms(createParamsList);

  return c.json({ createdArms }, 200);
}
