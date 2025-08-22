import { z } from 'zod';

export const Agent = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  metadata: z.record(z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Agent = z.infer<typeof Agent>;

export const AgentQueryParams = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type AgentQueryParams = z.infer<typeof AgentQueryParams>;

export const AgentCreateParams = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export type AgentCreateParams = z.infer<typeof AgentCreateParams>;

export const AgentUpdateParams = z
  .object({
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['description', 'metadata'];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['description', 'metadata'],
    },
  );

export type AgentUpdateParams = z.infer<typeof AgentUpdateParams>;
