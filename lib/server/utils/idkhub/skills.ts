import type { UserDataStorageConnector } from '@server/types/connector';
import type { Skill } from '@shared/types/data/skill';

export async function getSkill(
  userDataStorageConnector: UserDataStorageConnector,
  agentId: string,
  skillName: string,
): Promise<Skill | null> {
  const skills = await userDataStorageConnector.getSkills({
    name: skillName,
    agent_id: agentId,
  });
  if (skills.length > 0) {
    return skills[0];
  } else {
    return null;
  }
}
