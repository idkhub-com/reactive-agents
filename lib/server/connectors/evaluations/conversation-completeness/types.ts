import z from 'zod';

export interface ConversationCompletenessResult {
  score: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationCompletenessAverageResult {
  average_score: number;
  total_logs: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}

export const ConversationCompletenessEvaluationParameters = z
  .object({
    threshold: z.number().min(0).max(1),
    model: z.string().default('gpt-4'),
    temperature: z.number().min(0).max(2).default(0.1),
    max_tokens: z.number().int().positive().default(1000),
    include_reason: z.boolean().default(true),
    strict_mode: z.boolean().default(false),
    async_mode: z.boolean().default(false),
    verbose_mode: z.boolean().default(false),
    batch_size: z.number().int().positive().default(10),
  })
  .strict();

export type ConversationCompletenessEvaluationParameters = z.infer<
  typeof ConversationCompletenessEvaluationParameters
>;
