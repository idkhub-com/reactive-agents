import { z } from 'zod';

export const SkillMetadata = z.object({
  last_trained_at: z.iso.datetime({ offset: true }).optional(),
  /** The timestamp of the most recent log used in the last training batch.
   *
   * We will query the logs from this timestamp to the current time to find the most recent logs. */
  last_trained_log_start_time: z.number().optional(),
  /** Timestamp when optimization was started. Used as a lock to prevent concurrent optimization.
   *
   * If this timestamp is more than 6 hours old, it's considered stale and can be overwritten. */
  optimization_started_at: z.iso.datetime({ offset: true }).optional(),
});

export const Skill = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),

  /** Name of the skill. Unique within the agent. */
  name: z.string(),

  /** Description of the skill. This will be used by IdkHub to automatically optimize the skill. */
  description: z.string(),

  /** Internal metadata for the skill. */
  metadata: SkillMetadata,

  /** Maximum number of configurations for the skill. */
  max_configurations: z.number().int().default(3),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Skill = z.infer<typeof Skill>;

export const SkillQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    name: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillQueryParams = z.infer<typeof SkillQueryParams>;

export const SkillCreateParams = z
  .object({
    agent_id: z.uuid(),
    name: z.string().min(1).max(255),
    description: z.string().min(25).max(10000),
    metadata: z.record(z.string(), z.unknown()).default({}),
    max_configurations: z.number().int().min(0).max(25).default(3),
  })
  .strict();

export type SkillCreateParams = z.infer<typeof SkillCreateParams>;

export const SkillUpdateParams = z
  .object({
    description: z.string().min(25).max(10000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    max_configurations: z.number().int().min(0).max(25).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['description', 'metadata', 'max_configurations'];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['description', 'metadata', 'max_configurations'],
    },
  );

export type SkillUpdateParams = z.infer<typeof SkillUpdateParams>;
