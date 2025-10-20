import { IDKHUB_SKILLS } from '@server/constants';
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
    // Auto create internal skills
    if (skillName in IDKHUB_SKILLS) {
      const newSkill = await userDataStorageConnector.createSkill({
        agent_id: agentId,
        name: skillName,
        description: 'An idkHub internal skill',
        metadata: {},
        configuration_count: 0,
        optimize: false,
        system_prompt_count: 0,
        clustering_interval: 0,
        reflection_min_requests_per_arm: 0,
      });
      return newSkill;
    }
    return null;
  }
}
