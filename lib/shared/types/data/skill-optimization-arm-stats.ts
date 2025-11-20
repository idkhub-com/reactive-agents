import { z } from 'zod';

/**
 * Per-evaluation statistics for each arm
 * This table stores separate statistics for each evaluation method,
 * allowing weighted averaging of multiple evaluation methods
 */
export const SkillOptimizationArmStat = z.object({
  arm_id: z.uuid(),
  evaluation_id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  cluster_id: z.uuid(),
  /** Number of times this arm was evaluated by this evaluation method */
  n: z.number().int().min(0),
  /** Mean reward for this evaluation method */
  mean: z.number().min(0).max(1),
  /** Sum of squares of rewards (for variance calculation) */
  n2: z.number().min(0),
  /** Total reward for this evaluation method */
  total_reward: z.number().min(0),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimizationArmStat = z.infer<typeof SkillOptimizationArmStat>;

export const SkillOptimizationArmStatQueryParams = z
  .object({
    arm_id: z.uuid().optional(),
    evaluation_id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    cluster_id: z.uuid().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();
export type SkillOptimizationArmStatQueryParams = z.infer<
  typeof SkillOptimizationArmStatQueryParams
>;

export const SkillOptimizationArmStatCreateParams = z
  .object({
    arm_id: z.uuid(),
    evaluation_id: z.uuid(),
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    cluster_id: z.uuid(),
    n: z.number().int().min(0).default(0),
    mean: z.number().min(0).max(1).default(0),
    n2: z.number().min(0).default(0),
    total_reward: z.number().min(0).default(0),
  })
  .strict();
export type SkillOptimizationArmStatCreateParams = z.infer<
  typeof SkillOptimizationArmStatCreateParams
>;

export const SkillOptimizationArmStatUpdateParams = z
  .object({
    n: z.number().int().min(0).optional(),
    mean: z.number().min(0).max(1).optional(),
    n2: z.number().min(0).optional(),
    total_reward: z.number().min(0).optional(),
  })
  .strict();
export type SkillOptimizationArmStatUpdateParams = z.infer<
  typeof SkillOptimizationArmStatUpdateParams
>;
