import { z } from 'zod';

// Model Configuration parameters
export const SkillOptimizationModelParams = z.object({
  model_id: z.uuid(),
  system_prompt: z.string().min(1),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().positive(),
  top_p: z.number().min(0).max(1),
  frequency_penalty: z.number().min(-2).max(2),
  presence_penalty: z.number().min(-2).max(2),
  stop: z.array(z.string()),
  seed: z.number().int(),
  // Additional provider-specific parameters can be added here
  additional_params: z.record(z.string(), z.unknown()),
});
export type SkillOptimizationModelParams = z.infer<
  typeof SkillOptimizationModelParams
>;

export const SkillOptimizationEvaluationResult = z.object({
  evaluation_name: z.string().min(1),
  evaluation_score: z.number().min(0).max(1),
  extra_data: z.record(z.string(), z.unknown()),
});
export type SkillOptimizationEvaluationResult = z.infer<
  typeof SkillOptimizationEvaluationResult
>;

export const SkillOptimizationData = z.object({
  /** The parameters used for this configuration. These are sent to the
   * ai provider when generating completions */
  model_params: SkillOptimizationModelParams,

  /** The final results of when this configuration was evaluated */
  results: z.array(SkillOptimizationEvaluationResult),
});
export type SkillOptimizationData = z.infer<typeof SkillOptimizationData>;

export const SkillOptimization = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),

  /** The skill that this optimization is for */
  skill_id: z.uuid(),

  /** Auto-generated incrementing version number */
  version: z.number(),

  /** The optimized data and its results */
  data: SkillOptimizationData,
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
    data: SkillOptimizationData, // Just the params, we'll create the versioned structure
  })
  .strict();

export type SkillOptimizationCreateParams = z.infer<
  typeof SkillOptimizationCreateParams
>;

export const SkillOptimizationUpdateParams = z
  .object({
    data: SkillOptimizationData,
  })
  .strict();

export type SkillOptimizationUpdateParams = z.infer<
  typeof SkillOptimizationUpdateParams
>;
