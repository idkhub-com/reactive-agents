import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { z } from 'zod';

export enum EvaluationRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const EvaluationRun = z.object({
  id: z.string().uuid(),
  dataset_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  evaluation_method: z.nativeEnum(EvaluationMethodName),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(EvaluationRunStatus),
  results: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  started_at: z.string().datetime({ offset: true }).nullable().optional(),
  completed_at: z.string().datetime({ offset: true }).nullable().optional(),
});
export type EvaluationRun = z.infer<typeof EvaluationRun>;

export const EvaluationRunQueryParams = z
  .object({
    id: z.string().uuid().optional(),
    dataset_id: z.string().uuid().optional(),
    agent_id: z.string().uuid().optional(),
    evaluation_method: z.nativeEnum(EvaluationMethodName).optional(),
    name: z.string().min(1).optional(),
    status: z.nativeEnum(EvaluationRunStatus).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type EvaluationRunQueryParams = z.infer<typeof EvaluationRunQueryParams>;

export const EvaluationRunCreateParams = z
  .object({
    dataset_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    evaluation_method: z.nativeEnum(EvaluationMethodName),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export type EvaluationRunCreateParams = z.infer<
  typeof EvaluationRunCreateParams
>;

export const EvaluationRunUpdateParams = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: z.nativeEnum(EvaluationRunStatus).optional(),
    results: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    started_at: z.string().datetime({ offset: true }).nullable().optional(),
    completed_at: z.string().datetime({ offset: true }).nullable().optional(),
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
