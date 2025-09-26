import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { z } from 'zod';

export enum EvaluationRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const EvaluationRun = z.object({
  id: z.uuid(),
  dataset_id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  evaluation_method: z.enum(EvaluationMethodName),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(EvaluationRunStatus),
  results: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  started_at: z.iso.datetime({ offset: true }).nullable().optional(),
  completed_at: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type EvaluationRun = z.infer<typeof EvaluationRun>;

export const SkillEvaluation = EvaluationRun;
export type SkillEvaluation = z.infer<typeof SkillEvaluation>;

export const EvaluationRunQueryParams = z
  .object({
    id: z.uuid().optional(),
    dataset_id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    evaluation_method: z.enum(EvaluationMethodName).optional(),
    name: z.string().min(1).optional(),
    status: z.enum(EvaluationRunStatus).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type EvaluationRunQueryParams = z.infer<typeof EvaluationRunQueryParams>;

export const EvaluationRunCreateParams = z
  .object({
    dataset_id: z.uuid(),
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    evaluation_method: z.enum(EvaluationMethodName),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type EvaluationRunCreateParams = z.infer<
  typeof EvaluationRunCreateParams
>;

export const EvaluationRunUpdateParams = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: z.enum(EvaluationRunStatus).optional(),
    results: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    started_at: z.iso.datetime({ offset: true }).nullable().optional(),
    completed_at: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = [
        'name',
        'description',
        'status',
        'results',
        'metadata',
        'started_at',
        'completed_at',
      ];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: [
        'name',
        'description',
        'status',
        'results',
        'metadata',
        'started_at',
        'completed_at',
      ],
    },
  );

export type EvaluationRunUpdateParams = z.infer<
  typeof EvaluationRunUpdateParams
>;
