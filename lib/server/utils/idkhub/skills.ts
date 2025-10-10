import type { UserDataStorageConnector } from '@server/types/connector';
import type { Skill } from '@shared/types/data/skill';

export async function getOrCreateSkill(
  userDataStorageConnector: UserDataStorageConnector,
  agentId: string,
  skillName: string,
): Promise<Skill> {
  const skills = await userDataStorageConnector.getSkills({
    name: skillName,
    agent_id: agentId,
  });
  if (skills.length > 0) {
    return skills[0];
  } else {
    const newSkill = await userDataStorageConnector.createSkill({
      agent_id: agentId,
      name: skillName,
      description: 'This skill must be set up before it can be optimized.',
      metadata: {},
      max_configurations: 3,
      num_system_prompts: 0,
    });
    return newSkill;
  }
}
