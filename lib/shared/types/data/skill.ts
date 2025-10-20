import { z } from 'zod';

export const SkillMetadata = z.object({
  last_clustering_at: z.iso.datetime({ offset: true }).optional(),
  /** The timestamp of the most recent log used in the last clustering batch.
   *
   * We will query the logs from this timestamp to the current time to find the most recent logs. */
  last_clustering_log_start_time: z.number().optional(),
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

  /** Whether to optimize the skill. */
  optimize: z.boolean(),

  /** Number of configurations for the skill. */
  configuration_count: z.int(),

  /** The number of system prompts to generate */
  system_prompt_count: z.int(),

  /** Recompute the centroid of the cluster every N requests
   *  so that they can better represent the last N requests.
   */
  clustering_interval: z.int(),

  /** Minimum number of requests per arm in a configuration (cluster)
   * to trigger reflection.
   * This is to ensure that the arms for the cluster have convergence. */
  reflection_min_requests_per_arm: z.int(),

  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Skill = z.infer<typeof Skill>;

export const SkillQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    name: z
      .string()
      .regex(/^[a-z0-9_-]+$/, {
        message:
          'Name must only contain lowercase letters, numbers, underscores, and hyphens',
      })
      .min(3)
      .max(100)
      .optional(),
    optimize: z.boolean().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillQueryParams = z.infer<typeof SkillQueryParams>;

export const SkillCreateParams = z
  .object({
    agent_id: z.uuid(),
    name: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9_-]+$/, {
        message:
          'Name must only contain lowercase letters, numbers, underscores, and hyphens',
      }),
    description: z.string().min(25).max(10000),
    metadata: SkillMetadata,
    optimize: z.boolean(),
    configuration_count: z.int().min(1).max(25).default(3),
    system_prompt_count: z.int().min(1).max(25).default(3),
    clustering_interval: z.int().min(1).max(1000).default(15),
    reflection_min_requests_per_arm: z.int().min(1).max(1000).default(3),
  })
  .strict();

export type SkillCreateParams = z.infer<typeof SkillCreateParams>;

export const SkillUpdateParams = z
  .object({
    description: z.string().min(25).max(10000).optional(),
    metadata: SkillMetadata.optional(),
    optimize: z.boolean().optional(),
    configuration_count: z.int().min(1).max(25).optional(),
    system_prompt_count: z.int().min(1).max(25).optional(),
    clustering_interval: z.int().min(1).max(1000).optional(),
    reflection_min_requests_per_arm: z.int().min(1).max(1000).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = [
        'description',
        'metadata',
        'optimize',
        'configuration_count',
        'system_prompt_count',
        'clustering_interval',
        'reflection_min_requests_per_arm',
      ];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: [
        'description',
        'metadata',
        'optimize',
        'configuration_count',
        'system_prompt_count',
        'clustering_interval',
        'reflection_min_requests_per_arm',
      ],
    },
  );

export type SkillUpdateParams = z.infer<typeof SkillUpdateParams>;
