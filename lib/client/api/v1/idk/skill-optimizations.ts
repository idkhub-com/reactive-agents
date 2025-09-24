import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  SkillOptimization,
  type SkillOptimizationQueryParams,
} from '@shared/types/data';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function getSkillOptimizations(
  params: SkillOptimizationQueryParams,
): Promise<SkillOptimization[]> {
  const response = await client.v1.idk['skill-optimizations'].$get({
    query: {
      id: params.id,
      agent_id: params.agent_id,
      skill_id: params.skill_id,
      version: params.version?.toString(),
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skill optimizations');
  }

  return SkillOptimization.array().parse(await response.json());
}

export async function deleteSkillOptimization(id: string): Promise<void> {
  const response = await client.v1.idk['skill-optimizations'][
    ':skillOptimizationId'
  ].$delete({
    param: {
      skillOptimizationId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete skill optimization');
  }
}
