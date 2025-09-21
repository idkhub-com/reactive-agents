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
      metadata: {},
      max_configurations: 10,
    });
    return newSkill;
  }
}
