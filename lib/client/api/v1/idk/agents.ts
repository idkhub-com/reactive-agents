import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  Agent,
  type AgentCreateParams,
  type AgentQueryParams,
  type AgentUpdateParams,
  SkillOptimizationEvaluationRun,
} from '@shared/types/data';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function createAgent(params: AgentCreateParams): Promise<Agent> {
  const response = await client.v1.idk.agents.$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create agent');
  }

  return Agent.parse(await response.json());
}

export async function getAgents(params: AgentQueryParams): Promise<Agent[]> {
  const response = await client.v1.idk.agents.$get({
    query: {
      id: params.id,
      name: params.name,
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }

  return Agent.array().parse(await response.json());
}

export async function updateAgent(
  agentId: string,
  params: AgentUpdateParams,
): Promise<Agent> {
  const response = await client.v1.idk.agents[':agentId'].$patch({
    param: {
      agentId: agentId,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update agent');
  }

  return Agent.parse(await response.json());
}

export async function deleteAgent(id: string): Promise<void> {
  const response = await client.v1.idk.agents[':agentId'].$delete({
    param: {
      agentId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete agent');
  }
}

export async function getAgentEvaluationRuns(
  agentId: string,
): Promise<SkillOptimizationEvaluationRun[]> {
  const response = await client.v1.idk.agents[':agentId'][
    'evaluation-runs'
  ].$get({
    param: {
      agentId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch agent evaluation runs');
  }

  return SkillOptimizationEvaluationRun.array().parse(await response.json());
}
