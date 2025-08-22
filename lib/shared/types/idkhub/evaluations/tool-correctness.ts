import { z } from 'zod';

export const ToolCorrectnessEvaluationParameters = z.object({
  threshold: z.number().min(0).max(1).default(0.5),
  evaluation_params: z
    .array(z.enum(['INPUT_PARAMETERS', 'OUTPUT']))
    .default([]),
  include_reason: z.boolean().default(true),
  strict_mode: z.boolean().default(false),
  verbose_mode: z.boolean().default(false),
  should_consider_ordering: z.boolean().default(false),
  should_exact_match: z.boolean().default(false),
});

export type ToolCorrectnessEvaluationParameters = z.infer<
  typeof ToolCorrectnessEvaluationParameters
>;
