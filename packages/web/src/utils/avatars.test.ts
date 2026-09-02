import {
  createArmAvatar,
  createClusterAvatar,
  createSkillAvatar,
} from '@web/utils/avatars';
import { describe, expect, it } from 'vitest';

describe('createSkillAvatar', () => {
  it('draws the same avatar for the same name, wherever it is shown', () => {
    const avatar = createSkillAvatar('answer-simple-questions');
    expect(avatar).toMatch(/^data:image\/svg\+xml,/);
    expect(createSkillAvatar('answer-simple-questions')).toBe(avatar);
    expect(createSkillAvatar('another-skill')).not.toBe(avatar);
  });
});

describe('createClusterAvatar', () => {
  it('draws the same avatar for the same partition of the same skill', () => {
    const avatar = createClusterAvatar('answer-simple-questions', '1');
    expect(avatar).toMatch(/^data:image\/svg\+xml,/);
    expect(createClusterAvatar('answer-simple-questions', '1')).toBe(avatar);
    expect(createClusterAvatar('answer-simple-questions', '2')).not.toBe(
      avatar,
    );
  });

  it('tells the first partition of one skill from the first of another', () => {
    expect(createClusterAvatar('another-skill', '1')).not.toBe(
      createClusterAvatar('answer-simple-questions', '1'),
    );
  });
});

describe('createArmAvatar', () => {
  it('draws the same avatar for the same configuration', () => {
    const avatar = createArmAvatar('answer-simple-questions', '1', '2');
    expect(avatar).toMatch(/^data:image\/svg\+xml,/);
    expect(createArmAvatar('answer-simple-questions', '1', '2')).toBe(avatar);
    expect(createArmAvatar('answer-simple-questions', '1', '3')).not.toBe(
      avatar,
    );
  });

  it('tells configurations of sibling partitions apart', () => {
    expect(createArmAvatar('answer-simple-questions', '2', '1')).not.toBe(
      createArmAvatar('answer-simple-questions', '1', '1'),
    );
  });
});
