import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { RequestEmbeddingError } from '@api/utils/embeddings';
import { resolveEmbeddingModelConfig } from '@api/utils/evaluation-model-resolver';
import { cosineSimilarity } from '@api/utils/math';
import {
  type CachedIntent,
  embedIntent,
} from '@api/utils/super-agents/intent-embeddings';
import { createSkillForRequest } from '@api/utils/super-agents/skill-creation';
import { withSkillCreationLease } from '@api/utils/super-agents/skill-creation-lease';
import { warn } from '@shared/console-logging';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import type {
  Agent,
  Skill,
  SkillRouting,
  SkillRoutingDecision,
  SkillRoutingMethod,
} from '@shared/types/data';
import { describeRequestIntent } from '@shared/utils/request-intent';

/**
 * Past this many samples the mean moves at a fixed rate instead of settling,
 * so a skill keeps following the traffic it actually gets.
 */
const MAX_CENTROID_SAMPLES = 100;

/** What a request with no system prompt, tools or message is filed under. */
const DEFAULT_INTENT = 'General requests that carry no instructions or tools';

/**
 * A skill learns from the requests that name it at most this often, so a
 * tool that rewrites its prompt on every request costs one embedding a
 * minute rather than one per request. An intent already embedded is free,
 * but the check that says so is not.
 */
const LEARN_INTERVAL_MS = 60_000;
const MAX_LEARNING_SKILLS = 1000;

export type { SkillRoutingDecision, SkillRoutingMethod };

export interface SkillRoutingResult {
  skill: Skill;
  decision: SkillRoutingDecision;
}

/** A request that cannot be routed; `status` is what the caller should get. */
export class SkillRoutingError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422,
  ) {
    super(message);
    this.name = 'SkillRoutingError';
  }
}

/**
 * What a skill's centroid starts from, before it has served a request: the
 * prompt the gateway created it from, when there is one -- that is what the
 * next request like it will carry -- and otherwise its description.
 */
export function seedText(skill: Skill): string {
  return skill.seed_system_prompt || `${skill.name}: ${skill.description}`;
}

/** The running mean after one more sample, capped as described above. */
export function advanceCentroid(
  centroid: number[],
  sample: number[],
  sampleCount: number,
): number[] {
  const n = Math.min(sampleCount, MAX_CENTROID_SAMPLES);
  return centroid.map((value, i) => value + (sample[i] - value) / (n + 1));
}

function mostUsed(skills: Skill[]): Skill {
  return skills.reduce((best, skill) =>
    skill.total_requests > best.total_requests ? skill : best,
  );
}

/**
 * Moves a skill's centroid towards an intent -- or starts it from the intent,
 * when the skill has no centroid under this model -- once per intent: a tool
 * sends the same prompt with every request, and taking it in again would
 * move nothing. Not worth failing a request over; the next one recomputes
 * from whatever is stored.
 */
export async function absorbIntent(
  c: AppContext,
  connector: UserDataStorageConnector,
  agentId: string,
  skillId: string,
  routing: SkillRouting | undefined,
  intent: CachedIntent,
): Promise<void> {
  if (intent.absorbedBy.has(skillId)) {
    return;
  }
  try {
    await connector.upsertSkillRouting(c, {
      skill_id: skillId,
      agent_id: agentId,
      centroid: routing
        ? advanceCentroid(
            routing.centroid,
            intent.embedding,
            routing.sample_count,
          )
        : intent.embedding,
      embedding_model_id: intent.modelId,
      sample_count: routing ? routing.sample_count + 1 : 1,
    });
    intent.absorbedBy.add(skillId);
  } catch (e) {
    warn(
      `[SKILL_ROUTING] Could not update the centroid of skill ${skillId}:`,
      e,
    );
  }
}

/** Embeds an intent, or answers null when the embedding path is down. */
async function tryEmbedIntent(
  c: AppContext,
  connector: UserDataStorageConnector,
  intentText: string,
): Promise<CachedIntent | null> {
  try {
    const embeddingConfig = await resolveEmbeddingModelConfig(c, connector);
    if (!embeddingConfig) {
      return null;
    }
    return await embedIntent(c, connector, intentText, embeddingConfig.modelId);
  } catch (e) {
    if (e instanceof RequestEmbeddingError) {
      warn(`[SKILL_ROUTING] Could not embed the request: ${e.message}`);
      return null;
    }
    throw e;
  }
}

type RoutingPass =
  | { kind: 'routed'; result: SkillRoutingResult }
  /** No skill fits, and the agent may create one: what to create it from. */
  | {
      kind: 'create';
      skills: Skill[];
      intent: CachedIntent | null;
      similarity: number | null;
    };

/**
 * One look at the agent's skills: either the skill for the request, or the
 * finding that none fits and a skill should be created.
 */
async function routeOnce(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  intentText: string | null,
): Promise<RoutingPass> {
  const skills = await connector.getSkills(c, { agent_id: agent.id });
  const autoCreate = agent.auto_create_skills;
  const underCap =
    skills.filter((skill) => skill.auto_created).length <
    agent.max_auto_created_skills;

  const decide = (
    method: SkillRoutingMethod,
    similarity: number | null = null,
    threshold: number | null = null,
  ): SkillRoutingDecision => ({
    method,
    similarity,
    threshold,
    candidates: skills.length,
  });
  const routed = (
    skill: Skill,
    decision: SkillRoutingDecision,
  ): RoutingPass => ({
    kind: 'routed',
    result: { skill, decision },
  });
  const onlySkill = (): RoutingPass => routed(skills[0], decide('only_skill'));
  const fallback = (): RoutingPass =>
    skills.length === 1
      ? onlySkill()
      : routed(mostUsed(skills), decide('most_used'));
  const create = (
    intent: CachedIntent | null,
    similarity: number | null,
  ): RoutingPass => ({ kind: 'create', skills, intent, similarity });

  if (skills.length === 0) {
    if (!autoCreate || !underCap) {
      throw new SkillRoutingError(
        `Agent ${agent.name} has no skills to route to. Create one, or name it in the path: /v1/agents/${agent.name}/skills/{skill_name}/...`,
        404,
      );
    }
    // Nothing to compare against: the first request gets the first skill.
    return create(
      intentText ? await tryEmbedIntent(c, connector, intentText) : null,
      null,
    );
  }

  if (skills.length === 1 && !autoCreate) {
    return onlySkill();
  }
  if (!intentText) {
    return fallback();
  }

  const embeddingConfig = await resolveEmbeddingModelConfig(c, connector);
  if (!embeddingConfig) {
    if (skills.length === 1) {
      return onlySkill();
    }
    throw new SkillRoutingError(
      `Routing between the ${skills.length} skills of agent ${agent.name} needs an embedding model in system settings. Configure one, or name the skill in the path: /v1/agents/${agent.name}/skills/{skill_name}/...`,
      422,
    );
  }

  try {
    const routings = await connector.getSkillRoutings(c, {
      agent_id: agent.id,
    });
    const bySkill = new Map<string, SkillRouting>(
      routings
        .filter((r) => r.embedding_model_id === embeddingConfig.modelId)
        .map((r) => [r.skill_id, r]),
    );

    // Skills the router has not met yet start from their descriptions.
    await Promise.all(
      skills
        .filter((skill) => !bySkill.has(skill.id))
        .map(async (skill) => {
          const seed = await embedIntent(
            c,
            connector,
            seedText(skill),
            embeddingConfig.modelId,
          );
          const routing = await connector.upsertSkillRouting(c, {
            skill_id: skill.id,
            agent_id: agent.id,
            centroid: seed.embedding,
            embedding_model_id: embeddingConfig.modelId,
            sample_count: 1,
          });
          bySkill.set(skill.id, routing);
        }),
    );

    const intent = await embedIntent(
      c,
      connector,
      intentText,
      embeddingConfig.modelId,
    );

    let best: {
      skill: Skill;
      routing: SkillRouting;
      similarity: number;
    } | null = null;
    for (const skill of skills) {
      const routing = bySkill.get(skill.id);
      if (!routing) {
        continue;
      }
      const similarity = cosineSimilarity(intent.embedding, routing.centroid);
      if (!best || similarity > best.similarity) {
        best = { skill, routing, similarity };
      }
    }
    if (!best) {
      throw new RequestEmbeddingError('No skill has a routing centroid');
    }

    if (autoCreate && best.similarity < agent.skill_match_threshold) {
      if (underCap) {
        return create(intent, best.similarity);
      }
      warn(
        `[SKILL_ROUTING] Agent ${agent.name} is at its cap of ${agent.max_auto_created_skills} auto-created skills; routing to ${best.skill.name} at similarity ${best.similarity.toFixed(2)}`,
      );
    }

    // Learn from the decision, so skills follow their traffic.
    await absorbIntent(
      c,
      connector,
      agent.id,
      best.skill.id,
      best.routing,
      intent,
    );

    return routed(
      best.skill,
      decide(
        'embedding',
        best.similarity,
        autoCreate ? agent.skill_match_threshold : null,
      ),
    );
  } catch (e) {
    if (e instanceof RequestEmbeddingError) {
      warn(
        `[SKILL_ROUTING] Could not embed the request for agent ${agent.name}; using its most used skill: ${e.message}`,
      );
      return fallback();
    }
    throw e;
  }
}

/**
 * Picks the skill for a request that named only the agent.
 *
 * The request's intent (its system prompt and tool names, see
 * `describeRequestIntent`) is embedded and compared with each skill's
 * centroid; a skill the router has not met yet is seeded from its description
 * first. The winner's centroid then absorbs the request, so skills follow
 * their traffic.
 *
 * When the agent creates skills automatically, a request that resembles none
 * of them -- similarity below the agent's threshold -- becomes a skill of its
 * own, up to the agent's cap; an agent without skills gets its first one from
 * its first request. Creating happens under the agent's lease, after a second
 * look at its skills: concurrent first requests would otherwise each create
 * one, and the request that held the lease before may have created exactly
 * the skill this one needs. With creation off, one skill needs no deciding
 * and an agent without skills is refused.
 *
 * When the intent cannot be embedded -- no text, or the embedding provider
 * failing -- the most used skill serves the request rather than failing it,
 * and the decision says so.
 */
export async function routeRequestToSkill(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  saRequestData: SuperAgentsRequestData,
): Promise<SkillRoutingResult> {
  const intentText = describeRequestIntent(saRequestData);
  const first = await routeOnce(c, connector, agent, intentText);
  if (first.kind === 'routed') {
    return first.result;
  }

  return withSkillCreationLease(c, connector, agent, async () => {
    const again = await routeOnce(c, connector, agent, intentText);
    if (again.kind === 'routed') {
      return again.result;
    }
    return {
      skill: await createSkillForRequest(
        c,
        connector,
        agent,
        saRequestData,
        intentText ?? DEFAULT_INTENT,
        again.intent,
        again.skills,
      ),
      decision: {
        method: 'created',
        similarity: again.similarity,
        threshold: agent.skill_match_threshold,
        candidates: again.skills.length,
      },
    };
  });
}

/** When each skill last learned from a request that named it. */
const lastLearnedAt = new Map<string, number>();

/**
 * Teaches the router from a request that named its skill.
 *
 * That is the surest sign of what a skill is for -- surer than the router's
 * own decisions, which only ever confirm themselves -- and it is how an agent
 * whose skills have always been named gets centroids that reflect their
 * traffic rather than their descriptions, ready for the day a request names
 * only the agent.
 *
 * Meant to run once the response is on its way. An intent the skill has
 * already taken in costs nothing; a new one costs an embedding, at most once
 * per `LEARN_INTERVAL_MS` per skill. Nothing here can fail the request.
 */
export async function learnSkillIntent(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  skill: Skill,
  saRequestData: SuperAgentsRequestData,
): Promise<void> {
  const intentText = describeRequestIntent(saRequestData);
  if (!intentText) {
    return;
  }

  const now = Date.now();
  const last = lastLearnedAt.get(skill.id);
  if (last !== undefined && now - last < LEARN_INTERVAL_MS) {
    return;
  }
  lastLearnedAt.delete(skill.id);
  lastLearnedAt.set(skill.id, now);
  while (lastLearnedAt.size > MAX_LEARNING_SKILLS) {
    lastLearnedAt.delete(lastLearnedAt.keys().next().value as string);
  }

  try {
    // Checked here first so a deployment without an embedding model is not
    // warned about it on every attempt.
    const settings = await connector.getSystemSettings(c);
    if (!settings.embedding_model_id) {
      return;
    }
    const embeddingConfig = await resolveEmbeddingModelConfig(c, connector);
    if (!embeddingConfig) {
      return;
    }

    const intent = await embedIntent(
      c,
      connector,
      intentText,
      embeddingConfig.modelId,
    );
    if (intent.absorbedBy.has(skill.id)) {
      return;
    }
    const [routing] = await connector.getSkillRoutings(c, {
      skill_id: skill.id,
    });
    await absorbIntent(
      c,
      connector,
      agent.id,
      skill.id,
      routing?.embedding_model_id === embeddingConfig.modelId
        ? routing
        : undefined,
      intent,
    );
  } catch (e) {
    if (e instanceof RequestEmbeddingError) {
      warn(
        `[SKILL_ROUTING] Could not learn from a request to skill ${skill.name}: ${e.message}`,
      );
      return;
    }
    throw e;
  }
}

/** Forgets when skills last learned. For tests. */
export function resetSkillLearning(): void {
  lastLearnedAt.clear();
}
