import { z } from 'zod';

export const RoleAdherenceEvaluationParameters = z.object({
  threshold: z.number().min(0).max(1).default(0.7).optional(),
  model: z.string().optional(),
  include_reason: z.boolean().optional(),
  strict_mode: z.boolean().optional(),
  async_mode: z.boolean().optional(),
  verbose_mode: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),

  role_definition: z.string().optional(),
  assistant_output: z.string().optional(),
  instructions: z.string().optional(),

  batch_size: z.number().positive().optional(),
  limit: z.number().positive().optional(),
  offset: z.number().int().min(0).optional(),
  agent_id: z.string().optional(),
});

export type RoleAdherenceEvaluationParameters = z.infer<
  typeof RoleAdherenceEvaluationParameters
>;
