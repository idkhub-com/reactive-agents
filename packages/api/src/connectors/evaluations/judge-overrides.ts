import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import { z } from 'zod';

/**
 * The judge settings an evaluation may override, shared by every method that
 * asks a model to score something.
 *
 * System settings say how the judge runs by default -- its completion budget
 * and how hard it may think -- and that is the right place for it: the values
 * follow the judge model, and one model serves every evaluation. But a single
 * evaluation can be the exception. A rubric that wants a long chain of
 * reasoning, or one cheap enough to run with thinking off, sets its own here
 * and the setting no longer applies to it.
 *
 * Both are optional with no default, and that is load-bearing: absent means
 * inherit, so an evaluation created before these existed, or created without
 * an opinion, keeps following the settings as they change. Only a value
 * actually stored on the evaluation overrides one.
 */
export const JudgeOverrideParameters = z.object({
  /**
   * Completion tokens one attempt at this evaluation may spend, overriding
   * `options.judge.max_tokens`.
   */
  max_tokens: z.number().int().positive().optional(),
  /**
   * How hard the model may think before answering this evaluation,
   * overriding `options.judge.reasoning_effort`. `none` turns thinking off
   * where the global setting leaves it on.
   */
  reasoning_effort: z.enum(ReasoningEffort).optional(),
});

export type JudgeOverrideParameters = z.infer<typeof JudgeOverrideParameters>;

/** The overrides as the judge takes them, for spreading into its config. */
export const judgeOverrides = (
  params: JudgeOverrideParameters,
): JudgeOverrideParameters => ({
  ...(params.max_tokens !== undefined && { max_tokens: params.max_tokens }),
  ...(params.reasoning_effort !== undefined && {
    reasoning_effort: params.reasoning_effort,
  }),
});
