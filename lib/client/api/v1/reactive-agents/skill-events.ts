import type { skillEventsRouter } from '@server/api/v1/reactive-agents/skill-events';
import type { SkillEventQueryParams } from '@shared/types/data/skill-event';
import { hc } from 'hono/client';

const client = hc<typeof skillEventsRouter>('/v1/reactive-agents/skill-events');

export async function getSkillEvents(params: SkillEventQueryParams) {
  // Convert params to query strings for Hono
  const query: Record<string, string> = {};
  if (params.id) query.id = params.id;
  if (params.agent_id) query.agent_id = params.agent_id;
  if (params.skill_id) query.skill_id = params.skill_id;
  if (params.cluster_id) query.cluster_id = params.cluster_id;
  if (params.event_type) query.event_type = params.event_type;
  if (params.limit) query.limit = params.limit.toString();
  if (params.offset) query.offset = params.offset.toString();

  const response = await client.index.$get({ query });

  if (!response.ok) {
    throw new Error('Failed to fetch skill events');
  }

  return response.json();
}
