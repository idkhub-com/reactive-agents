import { z } from 'zod';

/** Model Configuration parameters
 * These are constants that define the range of values for each parameter.
 * All fields are normalized 0 to 1.
 */
export const SkillOptimizationBaseArmParams = z.object({
  temperature_min: z.number().min(0).max(1),
  temperature_max: z.number().min(0).max(1),
  top_p_min: z.number().min(0).max(1),
  top_p_max: z.number().min(0).max(1),
  top_k_min: z.number().min(0).max(1),
  top_k_max: z.number().min(0).max(1),
  frequency_penalty_min: z.number().min(0).max(1),
  frequency_penalty_max: z.number().min(0).max(1),
  presence_penalty_min: z.number().min(0).max(1),
  presence_penalty_max: z.number().min(0).max(1),
  thinking_min: z.number().min(0).max(1),
  thinking_max: z.number().min(0).max(1),
});
export type SkillOptimizationBaseArmParams = z.infer<
  typeof SkillOptimizationBaseArmParams
>;

export const SkillOptimizationArmParams = SkillOptimizationBaseArmParams.extend(
  {
    model_id: z.uuid(),
    system_prompt: z.string().min(1),
    // stop: z.array(z.string()),
    // seed: z.number().int(),
    // Additional provider-specific parameters can be added here
    // additional_params: z.record(z.string(), z.unknown()),
  },
);
export type SkillOptimizationArmParams = z.infer<
  typeof SkillOptimizationArmParams
>;

export const SkillOptimizationArmStats = z.object({
  /** Number of times the arm was played */
  n: z.number().min(0),
  /** Mean reward */
  mean: z.number().min(0).max(1),
  /** Sum of squares of rewards */
  n2: z.number().min(0),
  /** Total reward */
  total_reward: z.number().min(0),
});
export type SkillOptimizationArmStats = z.infer<
  typeof SkillOptimizationArmStats
>;

export const SkillOptimizationArm = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  cluster_id: z.uuid(),

  /** An auto-generated name for the arm. */
  name: z.string(),

  /** Complete Skill Optimization Arm Parameters
   * This configuration defines what parameters are sent to the AI provider.
   */
  params: SkillOptimizationArmParams,

  /** Statistics used for tracking the performance of the arm. */
  stats: SkillOptimizationArmStats,
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimizationArm = z.infer<typeof SkillOptimizationArm>;

export const SkillOptimizationArmQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    cluster_id: z.uuid().optional(),
    name: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(100).optional(),
    offset: z.coerce.number().min(0).default(0).optional(),
  })
  .strict();
export type SkillOptimizationArmQueryParams = z.infer<
  typeof SkillOptimizationArmQueryParams
>;

export const SkillOptimizationArmCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    cluster_id: z.uuid(),
    name: z.string(),
    params: SkillOptimizationArmParams,
    stats: SkillOptimizationArmStats,
  })
  .strict();
export type SkillOptimizationArmCreateParams = z.infer<
  typeof SkillOptimizationArmCreateParams
>;

// Only stats can be updated
// Name and params (including system_prompt) are constants defined at creation time
export const SkillOptimizationArmUpdateParams = z
  .object({
    stats: SkillOptimizationArmStats.partial().optional(),
  })
  .strict();
export type SkillOptimizationArmUpdateParams = z.infer<
  typeof SkillOptimizationArmUpdateParams
>;
