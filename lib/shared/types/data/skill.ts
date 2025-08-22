import { z } from 'zod';

export const Skill = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  metadata: z.record(z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Skill = z.infer<typeof Skill>;

export const SkillQueryParams = z
  .object({
    id: z.string().uuid().optional(),
    agent_id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillQueryParams = z.infer<typeof SkillQueryParams>;

export const SkillCreateParams = z
  .object({
    agent_id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export type SkillCreateParams = z.infer<typeof SkillCreateParams>;

export const SkillUpdateParams = z
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

export type SkillUpdateParams = z.infer<typeof SkillUpdateParams>;
