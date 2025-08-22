import { z } from 'zod';

export const ConversationCompletenessEvaluationParameters = z
  .object({
    threshold: z.number().min(0).max(1).default(0.5).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    timeout: z.number().int().positive().optional(),
    include_reason: z.boolean().optional(),
    strict_mode: z.boolean().optional(),
    async_mode: z.boolean().optional(),
    verbose_mode: z.boolean().optional(),
    batch_size: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().min(0).optional(),
    agent_id: z.string().uuid().optional(),
    dataset_id: z.string().uuid().optional(),
  })
  .strict();

export type ConversationCompletenessEvaluationParameters = z.infer<
  typeof ConversationCompletenessEvaluationParameters
>;
