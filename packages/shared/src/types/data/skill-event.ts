import { z } from 'zod';

/**
 * Event types for tracking skill optimization events
 */
export enum SkillEventType {
  /** System prompt regeneration for a specific cluster */
  REFLECTION = 'reflection',
  /** Model added to skill (affects all clusters) */
  MODEL_ADDED = 'model_added',
  /** Model removed from skill (affects all clusters) */
  MODEL_REMOVED = 'model_removed',
  /** Evaluation added to skill */
  EVALUATION_ADDED = 'evaluation_added',
  /** Evaluation removed from skill */
  EVALUATION_REMOVED = 'evaluation_removed',
  /** Evaluations regenerated with context */
  EVALUATION_REGENERATED = 'evaluation_regenerated',
  /** Partition manually reset by user */
  PARTITION_RESET = 'partition_reset',
  /** Skill description updated */
  DESCRIPTION_UPDATED = 'description_updated',
  /** Number of partitions (clusters) changed - triggers reclustering */
  PARTITIONS_RECLUSTERED = 'partitions_reclustered',
  /** Optimization enabled for skill */
  OPTIMIZATION_ENABLED = 'optimization_enabled',
  /** Optimization disabled for skill */
  OPTIMIZATION_DISABLED = 'optimization_disabled',
  /** Automatic reclustering triggered after accumulating enough logs */
  CLUSTERS_UPDATED = 'clusters_updated',
  /** Initial context generation after reaching 5 logs */
  CONTEXT_GENERATED = 'context_generated',
}

/**
 * A skill event tracks important changes that affect skill optimization
 */
export const SkillEvent = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  /** NULL for skill-wide events, NOT NULL for cluster-specific events */
  cluster_id: z.uuid().nullable(),

  event_type: z.nativeEnum(SkillEventType),

  /** Flexible metadata field for event-specific data */
  metadata: z.record(z.string(), z.unknown()).default({}),

  created_at: z.string().datetime({ offset: true }),
});

export type SkillEvent = z.infer<typeof SkillEvent>;

export const SkillEventQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    cluster_id: z.uuid().optional(),
    event_type: z.nativeEnum(SkillEventType).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillEventQueryParams = z.infer<typeof SkillEventQueryParams>;

export const SkillEventCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    cluster_id: z.uuid().nullable().optional(),
    event_type: z.nativeEnum(SkillEventType),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type SkillEventCreateParams = z.infer<typeof SkillEventCreateParams>;
