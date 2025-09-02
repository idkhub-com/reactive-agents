import { z } from 'zod';

export const Dataset = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_realtime: z.boolean().default(false),
  realtime_size: z.number().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Dataset = z.infer<typeof Dataset>;

export const DatasetQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    name: z.string().min(1).optional(),
    is_realtime: z.boolean().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type DatasetQueryParams = z.infer<typeof DatasetQueryParams>;

export const DatasetCreateParams = z
  .object({
    name: z.string().min(1),
    agent_id: z.uuid(),
    description: z.string().nullable().optional(),
    is_realtime: z.boolean().default(false),
    realtime_size: z.number().min(0).default(0),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type DatasetCreateParams = z.infer<typeof DatasetCreateParams>;

export const DatasetUpdateParams = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    // is_realtime should only be set when creating a new dataset to keep things simple
    // realtime_size field should be ignored if is_realtime is false
    realtime_size: z.number().min(0).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['name', 'description', 'metadata', 'realtime_size'];
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
