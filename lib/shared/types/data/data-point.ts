import { HttpMethod } from '@server/types/http';
import { z } from 'zod';

export const DataPoint = z.object({
  id: z.uuid(),
  method: z.enum(HttpMethod),
  endpoint: z.string().min(1),
  function_name: z.string().min(1),
  request_body: z.record(z.string(), z.unknown()),
  ground_truth: z.record(z.string(), z.unknown()).nullable().optional(),
  is_golden: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
});
export type DataPoint = z.infer<typeof DataPoint>;

export const DataPointQueryParams = z
  .object({
    ids: z.array(z.uuid()).optional(),
    hashes: z.array(z.string().min(1)).optional(),
    method: z.enum(HttpMethod).optional(),
    endpoint: z.string().min(1).optional(),
    function_name: z.string().min(1).optional(),
    is_golden: z.boolean().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type DataPointQueryParams = z.infer<typeof DataPointQueryParams>;

export const DataPointCreateParams = z
  .object({
    method: z.enum(HttpMethod),
    endpoint: z.string().min(1),
    function_name: z.string().min(1),
    request_body: z.record(z.string(), z.unknown()),
    ground_truth: z.record(z.string(), z.unknown()).nullable().optional(),
    is_golden: z.boolean(),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type DataPointCreateParams = z.infer<typeof DataPointCreateParams>;

export const DataPointUpdateParams = z
  .object({
    ground_truth: z.record(z.string(), z.unknown()).nullable().optional(),
    is_golden: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['ground_truth', 'is_golden', 'metadata'];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['ground_truth', 'is_golden', 'metadata'],
    },
  );

export type DataPointUpdateParams = z.infer<typeof DataPointUpdateParams>;
