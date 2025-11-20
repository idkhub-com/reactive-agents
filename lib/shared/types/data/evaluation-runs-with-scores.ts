import { z } from 'zod';

/**
 * View that extracts scores from evaluation runs for efficient chart queries
 */
export const EvaluationRunWithScores = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  cluster_id: z.uuid().nullable(),
  log_id: z.uuid(),
  created_at: z.string().datetime(),
  avg_score: z.number().nullable(),
  scores_by_evaluation: z.record(z.string(), z.number()).nullable(),
});

export type EvaluationRunWithScores = z.infer<typeof EvaluationRunWithScores>;

export const EvaluationRunWithScoresQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    cluster_id: z.uuid().optional(),
    log_id: z.uuid().optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
    limit: z.number().min(1).max(10000).optional(),
    offset: z.number().min(0).optional(),
  })
  .strict();

export type EvaluationRunWithScoresQueryParams = z.infer<
  typeof EvaluationRunWithScoresQueryParams
>;

/**
 * Parameters for time-bucketed evaluation scores query
 */
export const EvaluationScoresByTimeBucketParams = z.object({
  agent_id: z.uuid().optional(),
  skill_id: z.uuid().optional(),
  cluster_id: z.uuid().optional(),
  interval_minutes: z.number().min(1).max(1440), // 1 min to 1 day
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
});

export type EvaluationScoresByTimeBucketParams = z.infer<
  typeof EvaluationScoresByTimeBucketParams
>;

/**
 * Result from time-bucketed evaluation scores query
 */
export const EvaluationScoresByTimeBucketResult = z.object({
  time_bucket: z.string(), // PostgreSQL timestamptz format (e.g., "2025-11-15 07:00:00+00")
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  cluster_id: z.uuid().nullable(),
  avg_score: z.number().nullable(),
  scores_by_evaluation: z.record(z.string(), z.number()).nullable(),
  count: z.number(),
});

export type EvaluationScoresByTimeBucketResult = z.infer<
  typeof EvaluationScoresByTimeBucketResult
>;
