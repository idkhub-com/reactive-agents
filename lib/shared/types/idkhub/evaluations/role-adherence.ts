import { z } from 'zod';

export const RoleAdherenceEvaluationParameters = z.object({
  threshold: z.number().min(0).max(1).default(0.7),
  model: z.string().default('gpt-4o'),
  include_reason: z.boolean().default(true),
  strict_mode: z.boolean().default(false),
  async_mode: z.boolean().default(false),
  verbose_mode: z.boolean().default(false),
  temperature: z.number().min(0).max(2).default(0.1),
  max_tokens: z.number().positive().default(1000),
  batch_size: z.number().positive().default(1000),

  // role_definition: z.string().optional(),
  // assistant_output: z.string().optional(),
  // instructions: z.string().optional(),
});

export type RoleAdherenceEvaluationParameters = z.infer<
  typeof RoleAdherenceEvaluationParameters
>;
