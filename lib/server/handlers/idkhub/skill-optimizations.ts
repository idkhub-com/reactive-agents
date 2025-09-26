import { generateSystemPromptForSkill } from '@server/handlers/idkhub/system-prompt';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import type { BaseArm } from '@shared/types/data';

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
}
