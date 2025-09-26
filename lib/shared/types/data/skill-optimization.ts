import { z } from 'zod';

// Model Configuration parameters
// All fields are normalized 0 to 1.
export const BaseArm = z.object({
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
export type BaseArm = z.infer<typeof BaseArm>;

// Model Configuration parameters
// All fields are normalized 0 to 1.
export const SkillOptimizationConfigurationModelParams = BaseArm.extend({
  model_id: z.uuid(),
  system_prompt: z.string().min(1),
  // stop: z.array(z.string()),
  // seed: z.number().int(),
  // Additional provider-specific parameters can be added here
  // additional_params: z.record(z.string(), z.unknown()),
});
export type SkillOptimizationConfigurationModelParams = z.infer<
  typeof SkillOptimizationConfigurationModelParams
>;

export const SkillOptimizationConfigurationEvaluationResult = z.object({
  evaluation_name: z.string().min(1),
  evaluation_score: z.number().min(0).max(1),
  extra_data: z.record(z.string(), z.unknown()),
});
export type SkillOptimizationConfigurationEvaluationResult = z.infer<
  typeof SkillOptimizationConfigurationEvaluationResult
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
export const SkillOptimizationConfiguration = z.object({
  /** The parameters used for this configuration. These are sent to the
   * ai provider when generating completions */
  model_params: SkillOptimizationConfigurationModelParams,

  /** The final results of when this configuration was evaluated */
  results: z.array(SkillOptimizationConfigurationEvaluationResult),

  /** An array representing the center of the cluster of the logs
   * that this cluster was generated to perform best on.
   */
  cluster_center: z.array(z.number()),
});
export type SkillOptimizationConfiguration = z.infer<
  typeof SkillOptimizationConfiguration
>;

export const SkillOptimization = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),

  /** The skill that this optimization is for */
  skill_id: z.uuid(),

  /** Auto-generated incrementing version number */
  version: z.number(),

  /** An array of configurations for this optimization.
   * The length of the array is equal to the max number
   * of configurations set for the skill.
   */
  configurations: z.array(SkillOptimizationConfiguration),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimization = z.infer<typeof SkillOptimization>;

export const SkillOptimizationQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    version: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillOptimizationQueryParams = z.infer<
  typeof SkillOptimizationQueryParams
>;

export const SkillOptimizationCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    data: SkillOptimizationConfiguration, // Just the params, we'll create the versioned structure
  })
  .strict();

export type SkillOptimizationCreateParams = z.infer<
  typeof SkillOptimizationCreateParams
>;

export const SkillOptimizationUpdateParams = z
  .object({
    data: SkillOptimizationConfiguration,
  })
  .strict();

export type SkillOptimizationUpdateParams = z.infer<
  typeof SkillOptimizationUpdateParams
>;
