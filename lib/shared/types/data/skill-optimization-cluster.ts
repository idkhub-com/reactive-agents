import { z } from 'zod';

/** An optimization cluster.
 *
 * A skill optimization cluster is a group of logs that have similar
 * semantic meaning.
 */
export const SkillOptimizationCluster = z.object({
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
  centroid: z.array(z.number()),

  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimizationCluster = z.infer<typeof SkillOptimizationCluster>;

export const SkillOptimizationClusterQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillOptimizationClusterQueryParams = z.infer<
  typeof SkillOptimizationClusterQueryParams
>;

export const SkillOptimizationClusterCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    total_steps: z.number().min(0),
    centroid: z.array(z.number()),
  })
  .strict();

export type SkillOptimizationClusterCreateParams = z.infer<
  typeof SkillOptimizationClusterCreateParams
>;

export const SkillOptimizationClusterUpdateParams = z
  .object({
    total_steps: z.number().min(0).optional(),
    centroid: z.array(z.number()).optional(),
  })
  .strict();

export type SkillOptimizationClusterUpdateParams = z.infer<
  typeof SkillOptimizationClusterUpdateParams
>;
