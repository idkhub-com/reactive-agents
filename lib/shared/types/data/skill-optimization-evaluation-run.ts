import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { z } from 'zod';

export const SkillOptimizationEvaluationResult = z.object({
  evaluation_method: z.enum(EvaluationMethodName),
  evaluation_score: z.number().min(0).max(1),
  extra_data: z.record(z.string(), z.unknown()),
});
export type SkillOptimizationEvaluationResult = z.infer<
  typeof SkillOptimizationEvaluationResult
>;

/** An optimized configuration used for AI inference.
 *
 * A group of logs were generated using a clustering algorithm
 * to group similar logs together.
 * Then this **optimal** configuration was generated to produce
 * the best results on one of the clusters.
 * We assume this configuration is also optimal
 * for any future requests that are similar to any of the
 * logs in the cluster. */
export const SkillOptimizationEvaluationRun = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  cluster_id: z.uuid(),

  /** The results of when the arm pull was evaluated */
  results: z.array(SkillOptimizationEvaluationResult),

  /** When the evaluation run was created */
  created_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimizationEvaluationRun = z.infer<
  typeof SkillOptimizationEvaluationRun
>;

export const SkillOptimizationEvaluationRunQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    cluster_id: z.uuid().optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  })
  .strict();
export type SkillOptimizationEvaluationRunQueryParams = z.infer<
  typeof SkillOptimizationEvaluationRunQueryParams
>;

export const SkillOptimizationEvaluationRunCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    cluster_id: z.uuid(),
    results: z.array(SkillOptimizationEvaluationResult),
  })
  .strict();
export type SkillOptimizationEvaluationRunCreateParams = z.infer<
  typeof SkillOptimizationEvaluationRunCreateParams
>;
