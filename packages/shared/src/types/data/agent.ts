import { z } from 'zod';

export const Agent = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()),

  /** Whether a request that names only the agent may become a new skill when
   * it resembles none of the existing ones. */
  auto_create_skills: z.boolean(),

  /** Cosine similarity to the closest skill below which such a request gets a
   * skill of its own. */
  skill_match_threshold: z.number().min(0).max(1),

  /** How many skills the gateway may create for the agent. Past it, requests
   * go to the closest skill however far it is. */
  max_auto_created_skills: z.int().min(0),

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
      .refine((name) => name !== 'super-agents', {
        message:
          'The name "super-agents" is reserved for internal system use. Please choose a different name.',
      }),
    description: z.string().min(25).max(10000),
    metadata: z.record(z.string(), z.unknown()).default({}),
    auto_create_skills: z.boolean().default(true),
    skill_match_threshold: z.number().min(0).max(1).default(0.8),
    max_auto_created_skills: z.int().min(0).default(10),
  })
  .strict();

export type AgentCreateParams = z.infer<typeof AgentCreateParams>;

export const AgentUpdateParams = z
  .object({
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    auto_create_skills: z.boolean().optional(),
    skill_match_threshold: z.number().min(0).max(1).optional(),
    max_auto_created_skills: z.int().min(0).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = [
        'description',
        'metadata',
        'auto_create_skills',
        'skill_match_threshold',
        'max_auto_created_skills',
      ];
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
