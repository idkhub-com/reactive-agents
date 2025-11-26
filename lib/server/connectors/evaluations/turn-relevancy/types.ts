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

// AI-modifiable parameters - none needed, evaluation works automatically
export const TurnRelevancyEvaluationAIParameters = z.object({}).strict();

// Full parameters including user-modifiable settings
// Note: model is configured via evaluation.model_id, not in parameters
export const TurnRelevancyEvaluationParameters =
  TurnRelevancyEvaluationAIParameters.extend({
    threshold: z.number().min(0).max(1).default(0.7),
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
  });

export type TurnRelevancyEvaluationParameters = z.infer<
  typeof TurnRelevancyEvaluationParameters
>;
