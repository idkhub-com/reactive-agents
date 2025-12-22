import { z } from 'zod';

export const Tool = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  hash: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  raw_data: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Tool = z.infer<typeof Tool>;

export const ToolQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    hash: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();

export type ToolQueryParams = z.infer<typeof ToolQueryParams>;

export const ToolCreateParams = z
  .object({
    agent_id: z.uuid(),
    hash: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    raw_data: z.record(z.string(), z.unknown()),
  })
  .strict();

export type ToolCreateParams = z.infer<typeof ToolCreateParams>;
