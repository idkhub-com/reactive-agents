import {
  describeSkillRouting,
  readSkillRouting,
} from '@web/utils/skill-routing';
import { describe, expect, it } from 'vitest';

describe('readSkillRouting', () => {
  it('reads a decision the gateway recorded', () => {
    expect(
      readSkillRouting({
        skill_routing: {
          method: 'embedding',
          similarity: 0.93,
          threshold: 0.8,
          candidates: 2,
        },
      }),
    ).toEqual({
      method: 'embedding',
      similarity: 0.93,
      threshold: 0.8,
      candidates: 2,
    });
  });

  it('is null for a log whose skill the caller named, or older logs', () => {
    expect(readSkillRouting({})).toBeNull();
    expect(readSkillRouting(null)).toBeNull();
    expect(readSkillRouting({ skill_routing: { method: 'guess' } })).toBeNull();
  });
});

describe('describeSkillRouting', () => {
  it('shows the similarity against the threshold', () => {
    const description = describeSkillRouting({
      method: 'embedding',
      similarity: 0.93,
      threshold: 0.8,
      candidates: 2,
    });
    expect(description.label).toBe('closest skill');
    expect(description.detail).toBe('0.93 \u2265 0.80 \u00b7 2 candidates');
  });

  it('shows why a skill was created', () => {
    const description = describeSkillRouting({
      method: 'created',
      similarity: 0.41,
      threshold: 0.8,
      candidates: 1,
    });
    expect(description.label).toBe('new skill');
    expect(description.detail).toBe('0.41 < 0.80 \u00b7 1 candidate');
  });

  it('has nothing to add for the only skill', () => {
    expect(
      describeSkillRouting({
        method: 'only_skill',
        similarity: null,
        threshold: null,
        candidates: 1,
      }),
    ).toMatchObject({ label: 'only skill', detail: '1 candidate' });
    expect(
      describeSkillRouting({
        method: 'created',
        similarity: null,
        threshold: 0.8,
        candidates: 0,
      }).detail,
    ).toBeNull();
  });
});
