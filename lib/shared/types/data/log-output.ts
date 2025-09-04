import { z } from 'zod';

export const LogOutput = z.object({
  id: z.string().uuid(),
  log_id: z.string().uuid(),
  output: z.record(z.string(), z.unknown()),
  score: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime({ offset: true }),
});
export type LogOutput = z.infer<typeof LogOutput>;

export const LogOutputQueryParams = z
  .object({
    ids: z.string().uuid().array().optional(),
    log_ids: z.string().uuid().array().optional(),
    score_min: z.coerce.number().optional(),
    score_max: z.coerce.number().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type LogOutputQueryParams = z.infer<typeof LogOutputQueryParams>;

export const LogOutputCreateParams = z
  .object({
    log_id: z.string().uuid(),
    output: z.record(z.string(), z.unknown()),
    score: z.number().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type LogOutputCreateParams = z.infer<typeof LogOutputCreateParams>;
