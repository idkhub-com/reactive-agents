import { BaseArmsParams } from '@server/optimization/base-arms';
import { generateSeedSystemPromptForSkill } from '@server/optimization/utils/system-prompt';
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

  // Remove all current arms for the skill
  await userStorageConnector.deleteSkillOptimizationArmsForSkill(skill.id);

  // Reset cluster step count
  const clusters = await userStorageConnector.getSkillOptimizationClusters({
    skill_id: skill.id,
  });

  if (!clusters) {
    return c.json({ error: 'Clusters not found' }, 404);
  }

  for (const cluster of clusters) {
    await userStorageConnector.updateSkillOptimizationCluster(cluster.id, {
      total_steps: 0,
    });
  }

  const skillModels = await userStorageConnector.getSkillModels(skill.id);
  const skillClusters = await userStorageConnector.getSkillOptimizationClusters(
    { skill_id: skill.id },
  );

  if (!skillModels || !skillClusters) {
    return c.json({ error: 'Skill models or clusters not found' }, 404);
  }

  const numberOfSystemPrompts = skill.system_prompt_count;

  const systemPromptPromises = [];
  for (let i = 0; i < numberOfSystemPrompts; i++) {
    systemPromptPromises.push(generateSeedSystemPromptForSkill(skill));
  }
  const systemPrompts = await Promise.all(systemPromptPromises);

  const createParamsList: SkillOptimizationArmCreateParams[] = [];

  // Used to give arms a human-readable name
  let humanArmIndex = 1;
  for (const cluster of skillClusters) {
    for (const model of skillModels) {
      for (const systemPrompt of systemPrompts) {
        for (const baseArm of BaseArmsParams) {
          const armParams: SkillOptimizationArmParams = {
            ...baseArm,
            model_id: model.id,
            system_prompt: systemPrompt,
          };
          const stats: SkillOptimizationArmStats = {
            n: 0,
            mean: 0,
            n2: 0,
            total_reward: 0,
          };
          const createParams: SkillOptimizationArmCreateParams = {
            agent_id: skill.agent_id,
            skill_id: skill.id,
            cluster_id: cluster.id,
            name: `Configuration ${humanArmIndex}`,
            params: armParams,
            stats: stats,
          };
          createParamsList.push(createParams);
          humanArmIndex++;
        }
      }
    }
  }

  const createdArms =
    await userStorageConnector.createSkillOptimizationArms(createParamsList);

  return c.json({ createdArms }, 200);
}
