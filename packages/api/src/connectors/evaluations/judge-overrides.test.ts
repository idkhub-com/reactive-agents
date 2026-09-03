import {
  JudgeOverrideParameters,
  judgeOverrides,
} from '@api/connectors/evaluations/judge-overrides';
import { TaskCompletionEvaluationParameters } from '@api/connectors/evaluations/task-completion/types';
import { TurnRelevancyEvaluationParameters } from '@api/connectors/evaluations/turn-relevancy/types';
import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import { describe, expect, it } from 'vitest';

/**
 * System settings say how the judge runs; an evaluation may disagree. What
 * matters here is that silence is not disagreement: an evaluation that says
 * nothing has to keep following the settings as they change.
 */

describe('judgeOverrides', () => {
  it('sends nothing for an evaluation with no opinion', () => {
    // Not `{ max_tokens: undefined }`: the judge merges this over the
    // resolved model config, where an explicit undefined would read as a
    // value and lose the setting.
    expect(judgeOverrides({})).toEqual({});
  });

  it('sends only the fields the evaluation actually set', () => {
    expect(judgeOverrides({ max_tokens: 16_000 })).toEqual({
      max_tokens: 16_000,
    });
    expect(judgeOverrides({ reasoning_effort: ReasoningEffort.NONE })).toEqual({
      reasoning_effort: 'none',
    });
    expect(
      judgeOverrides({
        max_tokens: 512,
        reasoning_effort: ReasoningEffort.HIGH,
      }),
    ).toEqual({ max_tokens: 512, reasoning_effort: 'high' });
  });
});

describe('JudgeOverrideParameters', () => {
  it('leaves both absent rather than defaulting them', () => {
    const params = JudgeOverrideParameters.parse({});

    expect(params.max_tokens).toBeUndefined();
    expect(params.reasoning_effort).toBeUndefined();
  });

  it('refuses a budget or an effort it could not honour', () => {
    expect(JudgeOverrideParameters.safeParse({ max_tokens: 0 }).success).toBe(
      false,
    );
    expect(JudgeOverrideParameters.safeParse({ max_tokens: 1.5 }).success).toBe(
      false,
    );
    expect(
      JudgeOverrideParameters.safeParse({ reasoning_effort: 'ultra' }).success,
    ).toBe(false);
  });
});

describe('evaluation parameters', () => {
  it('carries the overrides on every judge-backed method', () => {
    // Spot-checked on two: one with its own AI parameters, one without.
    const task = TaskCompletionEvaluationParameters.parse({
      task: 'rebase the branch',
      max_tokens: 16_000,
      reasoning_effort: ReasoningEffort.LOW,
    });
    expect(task.max_tokens).toBe(16_000);
    expect(task.reasoning_effort).toBe('low');

    const relevancy = TurnRelevancyEvaluationParameters.parse({
      reasoning_effort: ReasoningEffort.NONE,
    });
    expect(relevancy.reasoning_effort).toBe('none');
    expect(relevancy.max_tokens).toBeUndefined();
  });

  it('leaves an evaluation that says nothing following the settings', () => {
    const params = TaskCompletionEvaluationParameters.parse({ task: 'x' });

    expect(params.max_tokens).toBeUndefined();
    expect(params.reasoning_effort).toBeUndefined();
    // The rest of the parameters still take their defaults.
    expect(params.temperature).toBe(0.1);
  });
});
