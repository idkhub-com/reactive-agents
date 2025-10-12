import { EvaluationMethodName } from '@shared/types/evaluations';
import { z } from 'zod';

/**
 * An evaluation automatically created from the description of the skill.
 */
export const SkillOptimizationEvaluation = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  evaluation_method: z.enum(EvaluationMethodName),
  params: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillOptimizationEvaluation = z.infer<
  typeof SkillOptimizationEvaluation
>;

export const SkillOptimizationEvaluationQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    evaluation_method: z.enum(EvaluationMethodName).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillOptimizationEvaluationQueryParams = z.infer<
  typeof SkillOptimizationEvaluationQueryParams
>;

export const SkillOptimizationEvaluationCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    evaluation_method: z.enum(EvaluationMethodName),
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type SkillOptimizationEvaluationCreateParams = z.infer<
  typeof SkillOptimizationEvaluationCreateParams
>;
