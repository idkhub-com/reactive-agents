import { z } from 'zod';

export const LogOutput = z.object({
  id: z.uuid(),
  evaluation_run_id: z.uuid(),
  log_id: z.uuid(),
  output: z.record(z.string(), z.unknown()),
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
});
export type LogOutput = z.infer<typeof LogOutput>;

export const LogOutputQueryParams = z
  .object({
    ids: z.uuid().array().optional(),
    log_ids: z.uuid().array().optional(),
    score_min: z.coerce.number().optional(),
    score_max: z.coerce.number().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type LogOutputQueryParams = z.infer<typeof LogOutputQueryParams>;

export const LogOutputCreateParams = z
  .object({
    log_id: z.uuid(),
    output: z.record(z.string(), z.unknown()),
    score: z.number().min(0).max(1),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type LogOutputCreateParams = z.infer<typeof LogOutputCreateParams>;
