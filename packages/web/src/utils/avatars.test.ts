import { createSkillAvatar } from '@web/utils/skill-avatar';
import { describe, expect, it } from 'vitest';

describe('createSkillAvatar', () => {
  it('draws the same avatar for the same name, wherever it is shown', () => {
    const avatar = createSkillAvatar('answer-simple-questions');
    expect(avatar).toMatch(/^data:image\/svg\+xml,/);
    expect(createSkillAvatar('answer-simple-questions')).toBe(avatar);
    expect(createSkillAvatar('another-skill')).not.toBe(avatar);
  });
});
