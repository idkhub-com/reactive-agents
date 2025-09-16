import { z } from 'zod';

export const TurnRelevancyEvaluationParameters = z
  .object({
    threshold: z.number().min(0).max(1).default(0.7),
    model: z.string().default('gpt-4o'),
    temperature: z.number().min(0).max(2).default(0.1),
    max_tokens: z.number().int().positive().default(1000),
    include_reason: z.boolean().default(true),
    strict_mode: z.boolean().default(false),
    async_mode: z.boolean().default(true),
    verbose_mode: z.boolean().default(false),
    batch_size: z.number().int().positive().default(10),
    conversation_history: z.string().optional(),
    current_turn: z.string().optional(),
    instructions: z.string().optional(),
  })
  .strict();

export type TurnRelevancyEvaluationParameters = z.infer<
  typeof TurnRelevancyEvaluationParameters
>;
