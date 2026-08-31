import { z } from 'zod';

/**
 * Where an agent's requests go when the caller names only the agent.
 *
 * One row per skill: a running mean of the intent embeddings of the requests
 * the skill has served, seeded from its description. A request is routed to
 * the skill whose centroid its own intent embedding is closest to.
 */
export const SkillRouting = z.object({
  skill_id: z.uuid(),
  agent_id: z.uuid(),

  /** The mean intent embedding of the skill's traffic. */
  centroid: z.array(z.number()),

  /** The model the centroid was computed with. A row computed with another
   * model is meaningless under the current one and gets re-seeded. */
  embedding_model_id: z.uuid(),

  /** How many intents the mean has absorbed, the seed included. */
  sample_count: z.int().min(0),

  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillRouting = z.infer<typeof SkillRouting>;

export const SkillRoutingQueryParams = z
  .object({
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
  })
  .strict();
export type SkillRoutingQueryParams = z.infer<typeof SkillRoutingQueryParams>;

export const SkillRoutingUpsertParams = z
  .object({
    skill_id: z.uuid(),
    agent_id: z.uuid(),
    centroid: z.array(z.number()),
    embedding_model_id: z.uuid(),
    sample_count: z.int().min(0),
  })
  .strict();
export type SkillRoutingUpsertParams = z.infer<typeof SkillRoutingUpsertParams>;

export const SkillRoutingMethod = z.enum([
  'only_skill',
  'embedding',
  'most_used',
  'created',
]);
export type SkillRoutingMethod = z.infer<typeof SkillRoutingMethod>;

/** How a request that named only the agent was matched to a skill. Recorded
 * on the log as `metadata.skill_routing`. */
export const SkillRoutingDecision = z.object({
  method: SkillRoutingMethod,
  /** Cosine similarity to the closest skill's centroid, when one was computed. */
  similarity: z.number().nullable(),
  /** The agent's `skill_match_threshold`, when it was consulted. */
  threshold: z.number().nullable(),
  /** How many of the agent's skills were in the running. */
  candidates: z.int().min(0),
});
export type SkillRoutingDecision = z.infer<typeof SkillRoutingDecision>;
