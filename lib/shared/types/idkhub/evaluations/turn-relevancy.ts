import { z } from 'zod';

export const TurnRelevancyEvaluationParameters = z
  .object({
    threshold: z.number().min(0).max(1).default(0.7).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    include_reason: z.boolean().optional(),
    strict_mode: z.boolean().optional(),
    async_mode: z.boolean().optional(),
    verbose_mode: z.boolean().optional(),
    batch_size: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().min(0).optional(),
    agent_id: z.uuid().optional(),
    dataset_id: z.uuid().optional(),
    conversation_history: z.string().optional(),
    current_turn: z.string().optional(),
    instructions: z.string().optional(),
  })
  .strict();

export type TurnRelevancyEvaluationParameters = z.infer<
  typeof TurnRelevancyEvaluationParameters
>;
