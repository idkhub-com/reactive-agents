import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  SkillConfiguration,
  type SkillConfigurationCreateParams,
  type SkillConfigurationQueryParams,
  type SkillConfigurationUpdateParams,
} from '@shared/types/data';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function createSkillConfiguration(
  params: SkillConfigurationCreateParams,
): Promise<SkillConfiguration> {
  const response = await client.v1.idk['skill-configurations'].$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create skill configuration');
  }

  return SkillConfiguration.parse(await response.json());
}

export async function getSkillConfigurations(
  params: SkillConfigurationQueryParams,
): Promise<SkillConfiguration[]> {
  const response = await client.v1.idk['skill-configurations'].$get({
    query: {
      id: params.id,
      agent_id: params.agent_id,
      skill_id: params.skill_id,
      name: params.name,
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skill configurations');
  }

  return SkillConfiguration.array().parse(await response.json());
}

export async function updateSkillConfiguration(
  id: string,
  params: SkillConfigurationUpdateParams,
): Promise<SkillConfiguration> {
  const response = await client.v1.idk['skill-configurations'][
    ':skillConfigurationId'
  ].$patch({
    param: {
      skillConfigurationId: id,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update skill configuration');
  }

  return SkillConfiguration.parse(await response.json());
}

export async function deleteSkillConfiguration(id: string): Promise<void> {
  const response = await client.v1.idk['skill-configurations'][
    ':skillConfigurationId'
  ].$delete({
    param: {
      skillConfigurationId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete skill configuration');
  }
}
