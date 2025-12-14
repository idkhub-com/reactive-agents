import { z } from 'zod';

export const Agent = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Agent = z.infer<typeof Agent>;

export const AgentQueryParams = z
  .object({
    id: z.uuid().optional(),
    name: z
      .string()
      .regex(/^[a-z0-9_-]+$/, {
        message:
          'Name must only contain lowercase letters, numbers, underscores, and hyphens',
      })
      .min(3)
      .max(100)
      .optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type AgentQueryParams = z.infer<typeof AgentQueryParams>;

export const AgentCreateParams = z
  .object({
    name: z
      .string()
      .regex(/^[a-z0-9_-]+$/, {
        message:
          'Name must only contain lowercase letters, numbers, underscores, and hyphens',
      })
      .min(3)
      .max(100)
      .refine((name) => name !== 'reactive-agents', {
        message:
          'The name "reactive-agents" is reserved for internal system use. Please choose a different name.',
      }),
    description: z.string().min(25).max(10000),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type AgentCreateParams = z.infer<typeof AgentCreateParams>;

export const AgentUpdateParams = z
  .object({
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
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
