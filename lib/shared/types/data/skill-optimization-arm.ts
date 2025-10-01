import { z } from 'zod';

// Model Configuration parameters
// All fields are normalized 0 to 1.
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

// Model Configuration parameters
// All fields are normalized 0 to 1.
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
  n: z.number().min(0),
  mean: z.number().min(0).max(1),
  n2: z.number().min(0),
  total_reward: z.number().min(0),
});
export type SkillOptimizationArmStats = z.infer<
  typeof SkillOptimizationArmStats
>;

export const SkillOptimizationArm = SkillOptimizationArmParams.extend({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  params: SkillOptimizationArmParams,
  stats: SkillOptimizationArmStats,
  created_at: z.iso.date(),
  updated_at: z.iso.date(),
});
export type SkillOptimizationArm = z.infer<typeof SkillOptimizationArm>;

export const SkillOptimizationArmQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
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
    params: SkillOptimizationArmParams,
    stats: SkillOptimizationArmStats,
  })
  .strict();
export type SkillOptimizationArmCreateParams = z.infer<
  typeof SkillOptimizationArmCreateParams
>;

export const SkillOptimizationArmUpdateParams = z
  .object({
    stats: SkillOptimizationArmStats.partial(),
  })
  .strict();
export type SkillOptimizationArmUpdateParams = z.infer<
  typeof SkillOptimizationArmUpdateParams
>;
