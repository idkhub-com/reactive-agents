import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import {
  DEFAULT_JUDGE_MAX_TOKENS,
  INTERNAL_ROLES,
  mergeSystemSettingsOptions,
  SystemSettingsOptions,
  SystemSettingsOptionsUpdate,
  TEXT_ROLES,
} from '@shared/types/data/system-settings';
import { describe, expect, it } from 'vitest';

/**
 * The settings that need no column of their own live in one JSON document,
 * which puts the weight on this schema: its defaults are what a row written
 * before a field existed reads as, and its merge is what a PATCH means.
 */

describe('SystemSettingsOptions', () => {
  it('reads an empty document as every default', () => {
    const options = SystemSettingsOptions.parse({});

    expect(options.system_prompt_reflection.timeout_ms).toBe(120_000);
    expect(options.evaluation_generation.timeout_ms).toBe(120_000);
    expect(options.embedding.timeout_ms).toBe(30_000);
    expect(options.judge.timeout_ms).toBe(60_000);
    expect(options.judge.max_tokens).toBe(DEFAULT_JUDGE_MAX_TOKENS);
    expect(options.skill_arbiter.timeout_ms).toBe(15_000);
    expect(options.intent_compaction.timeout_ms).toBe(60_000);
    expect(options.developer_mode).toBe(false);
  });

  it('starts every text role at the model’s own reasoning default', () => {
    const options = SystemSettingsOptions.parse({});

    for (const role of TEXT_ROLES) {
      expect(options[role].reasoning_effort).toBeNull();
    }
  });

  it('gives an effort to every role but embedding', () => {
    // An embedding is one forward pass with nothing to think about, and its
    // slot only accepts an embed model.
    expect(TEXT_ROLES).toEqual(
      INTERNAL_ROLES.filter((role) => role !== 'embedding'),
    );
    expect(SystemSettingsOptions.parse({}).embedding).toEqual({
      timeout_ms: 30_000,
    });
  });

  it('fills only what a partial document lacks', () => {
    // This is what makes adding a setting a change to this schema alone: a
    // row stored before the field existed reads as if it had been set.
    const options = SystemSettingsOptions.parse({
      judge: { timeout_ms: 90_000 },
      developer_mode: true,
    });

    expect(options.judge).toEqual({
      timeout_ms: 90_000,
      max_tokens: DEFAULT_JUDGE_MAX_TOKENS,
      reasoning_effort: null,
    });
    expect(options.developer_mode).toBe(true);
    expect(options.skill_arbiter.timeout_ms).toBe(15_000);
  });
});

describe('SystemSettingsOptionsUpdate', () => {
  it('accepts a reasoning effort on any text role, and null to clear it', () => {
    for (const role of TEXT_ROLES) {
      expect(
        SystemSettingsOptionsUpdate.safeParse({
          [role]: { reasoning_effort: ReasoningEffort.NONE },
        }).success,
      ).toBe(true);
      expect(
        SystemSettingsOptionsUpdate.safeParse({
          [role]: { reasoning_effort: null },
        }).success,
      ).toBe(true);
    }
  });

  it('refuses an effort on the embedding role, which has none', () => {
    expect(
      SystemSettingsOptionsUpdate.safeParse({
        embedding: { reasoning_effort: ReasoningEffort.LOW },
      }).success,
    ).toBe(false);
  });

  it('refuses an effort outside the enum, and any unknown key', () => {
    expect(
      SystemSettingsOptionsUpdate.safeParse({
        judge: { reasoning_effort: 'ultra' },
      }).success,
    ).toBe(false);
    expect(
      SystemSettingsOptionsUpdate.safeParse({ judge: { thinking: 'low' } })
        .success,
    ).toBe(false);
    expect(
      SystemSettingsOptionsUpdate.safeParse({ judge_timeout_ms: 60_000 })
        .success,
    ).toBe(false);
  });

  it('bounds the timeouts and the judge token budget', () => {
    expect(
      SystemSettingsOptionsUpdate.safeParse({ judge: { timeout_ms: 500 } })
        .success,
    ).toBe(false);
    expect(
      SystemSettingsOptionsUpdate.safeParse({ judge: { max_tokens: 10 } })
        .success,
    ).toBe(false);
    expect(
      SystemSettingsOptionsUpdate.safeParse({
        judge: { timeout_ms: 90_000, max_tokens: 16_000 },
      }).success,
    ).toBe(true);
  });
});

describe('mergeSystemSettingsOptions', () => {
  const stored = SystemSettingsOptions.parse({});

  it('leaves everything a patch does not name', () => {
    const merged = mergeSystemSettingsOptions(stored, {
      judge: { max_tokens: 16_000 },
    });

    expect(merged.judge.max_tokens).toBe(16_000);
    // The judge's other fields, and every other role, are untouched.
    expect(merged.judge.timeout_ms).toBe(60_000);
    expect(merged.judge.reasoning_effort).toBeNull();
    expect(merged.skill_arbiter).toEqual(stored.skill_arbiter);
    expect(merged.developer_mode).toBe(false);
  });

  it('sets and clears a reasoning effort per role', () => {
    const set = mergeSystemSettingsOptions(stored, {
      judge: { reasoning_effort: ReasoningEffort.NONE },
      system_prompt_reflection: { reasoning_effort: ReasoningEffort.HIGH },
    });
    expect(set.judge.reasoning_effort).toBe('none');
    expect(set.system_prompt_reflection.reasoning_effort).toBe('high');
    expect(set.skill_arbiter.reasoning_effort).toBeNull();

    // Null is a value here -- back to the model's own default -- not an
    // omission, which is why the merge cannot simply drop nullish fields.
    const cleared = mergeSystemSettingsOptions(set, {
      judge: { reasoning_effort: null },
    });
    expect(cleared.judge.reasoning_effort).toBeNull();
    expect(cleared.system_prompt_reflection.reasoning_effort).toBe('high');
  });

  it('changes several fields of one role at once', () => {
    const merged = mergeSystemSettingsOptions(stored, {
      judge: {
        timeout_ms: 90_000,
        max_tokens: 16_000,
        reasoning_effort: ReasoningEffort.LOW,
      },
      developer_mode: true,
    });

    expect(merged.judge).toEqual({
      timeout_ms: 90_000,
      max_tokens: 16_000,
      reasoning_effort: 'low',
    });
    expect(merged.developer_mode).toBe(true);
  });

  it('is a no-op for an empty patch', () => {
    expect(mergeSystemSettingsOptions(stored, {})).toEqual(stored);
  });
});
