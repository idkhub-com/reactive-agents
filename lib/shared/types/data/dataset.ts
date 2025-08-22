import { z } from 'zod';

export const Dataset = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  metadata: z.record(z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Dataset = z.infer<typeof Dataset>;

export const DatasetQueryParams = z
  .object({
    id: z.string().uuid().optional(),
    agent_id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type DatasetQueryParams = z.infer<typeof DatasetQueryParams>;

export const DatasetCreateParams = z
  .object({
    name: z.string().min(1),
    agent_id: z.string().uuid(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export type DatasetCreateParams = z.infer<typeof DatasetCreateParams>;

export const DatasetUpdateParams = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['name', 'description', 'metadata'];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['name', 'description', 'metadata'],
    },
  );

export type DatasetUpdateParams = z.infer<typeof DatasetUpdateParams>;
