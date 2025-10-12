import { z } from 'zod';

export const TurnRelevancyResultSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  metadata: z
    .object({
      relevant: z.boolean().optional(),
      relevance_reasons: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
});

export type TurnRelevancyResult = z.infer<typeof TurnRelevancyResultSchema>;

export interface TurnRelevancyAverageResult {
  average_score: number;
  total_logs: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
  // Additional statistics
  min_score?: number;
  max_score?: number;
  median_score?: number;
  valid_results_count?: number;
  error_results_count?: number;
}

export interface TurnRelevancyMetadata {
  conversation_history?: string;
  current_turn?: string;
  instructions?: string;
  criteria?: {
    description?: string;
    strict_mode?: boolean;
    verbose_mode?: boolean;
    include_reason?: boolean;
  };
}

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
