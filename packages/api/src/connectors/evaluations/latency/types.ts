import { z } from 'zod';

/**
 * Parameters for latency evaluation (Time-to-First-Token / TTFT)
 *
 * This evaluation measures how quickly the AI provider starts responding.
 * For streaming requests: Uses first_token_time - start_time
 * For non-streaming requests: Uses the full duration as a proxy
 *
 * The score is normalized based on target_latency_ms and max_latency_ms:
 * - Responses at or below target_latency_ms score 1.0 (perfect)
 * - Responses at or above max_latency_ms score 0.0 (worst)
 * - Responses in between are scored linearly
 */
export const LatencyEvaluationParameters = z
  .object({
    /**
     * Target latency in milliseconds (ideal time-to-first-token)
     * Responses at or below this threshold score 1.0
     */
    target_latency_ms: z.number().positive().default(10_000),

    /**
     * Maximum acceptable latency in milliseconds
     * Responses at or above this threshold score 0.0
     */
    max_latency_ms: z.number().positive().default(30_000),
  })
  .refine((data) => data.target_latency_ms < data.max_latency_ms, {
    message: 'Target latency must be less than max latency',
    path: ['target_latency_ms'],
  });

export type LatencyEvaluationParameters = z.infer<
  typeof LatencyEvaluationParameters
>;
