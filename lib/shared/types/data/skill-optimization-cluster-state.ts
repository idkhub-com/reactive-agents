import { z } from 'zod';

/** The state of the algorithm for a skill optimization cluster.
 *
 * A skill optimization cluster is a group of logs that have similar
 * semantic meaning.
 *
 * The algorithm for which this object holds the state produces
 * the optimal configuration for that set of logs.
 */
export const SkillOptimizationClusterState = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),

  /**
   * The total number of requests that have been processed by the algorithm
   * in this cluster.
   */
  total_steps: z.number().min(0),

  /** An array representing the center of the cluster of the logs in
   * n-dimensional space.
   */
  cluster_center: z.array(z.number()),

  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimizationClusterState = z.infer<
  typeof SkillOptimizationClusterState
>;

export const SkillOptimizationClusterStateQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillOptimizationClusterStateQueryParams = z.infer<
  typeof SkillOptimizationClusterStateQueryParams
>;

export const SkillOptimizationClusterStateCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    total_steps: z.number().min(0),
    cluster_center: z.array(z.number()),
  })
  .strict();

export type SkillOptimizationClusterStateCreateParams = z.infer<
  typeof SkillOptimizationClusterStateCreateParams
>;

export const SkillOptimizationClusterStateUpdateParams = z
  .object({
    total_steps: z.number().min(0).optional(),
    cluster_center: z.array(z.number()).optional(),
  })
  .strict();

export type SkillOptimizationClusterStateUpdateParams = z.infer<
  typeof SkillOptimizationClusterStateUpdateParams
>;
