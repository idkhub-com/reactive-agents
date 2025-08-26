import { z } from 'zod';

export const DataPointOutput = z.object({
  id: z.uuid(),
  data_point_id: z.uuid(),
  output: z.record(z.string(), z.unknown()),
  score: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
});
export type DataPointOutput = z.infer<typeof DataPointOutput>;

export const DataPointOutputQueryParams = z
  .object({
    ids: z.uuid().array().optional(),
    data_point_ids: z.uuid().array().optional(),
    score_min: z.coerce.number().optional(),
    score_max: z.coerce.number().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type DataPointOutputQueryParams = z.infer<
  typeof DataPointOutputQueryParams
>;

export const DataPointOutputCreateParams = z
  .object({
    data_point_id: z.uuid(),
    output: z.record(z.string(), z.unknown()),
    score: z.number().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type DataPointOutputCreateParams = z.infer<
  typeof DataPointOutputCreateParams
>;
