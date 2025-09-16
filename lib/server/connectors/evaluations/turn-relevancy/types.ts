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
