import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  Model,
  Skill,
  type SkillCreateParams,
  type SkillQueryParams,
  type SkillUpdateParams,
} from '@shared/types/data';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function createSkill(params: SkillCreateParams): Promise<Skill> {
  const response = await client.v1.idk.skills.$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create skill');
  }

  return Skill.parse(await response.json());
}

export async function getSkills(params: SkillQueryParams): Promise<Skill[]> {
  const response = await client.v1.idk.skills.$get({
    query: {
      id: params.id,
      agent_id: params.agent_id,
      name: params.name,
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skills');
  }

  return Skill.array().parse(await response.json());
}

export async function updateSkill(
  id: string,
  params: SkillUpdateParams,
): Promise<Skill> {
  const response = await client.v1.idk.skills[':skillId'].$patch({
    param: {
      skillId: id,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update skill');
  }

  return Skill.parse(await response.json());
}

export async function deleteSkill(id: string): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].$delete({
    param: {
      skillId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete skill');
  }
}

export async function getModelsBySkillId(skillId: string): Promise<Model[]> {
  const response = await client.v1.idk.skills[':skillId'].models.$get({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch models for skill');
  }

  return Model.array().parse(await response.json());
}

export async function addModelsToSkill(
  skillId: string,
  modelIds: string[],
): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].models.$post({
    param: {
      skillId,
    },
    json: { modelIds },
  });

  if (!response.ok) {
    throw new Error('Failed to add models to skill');
  }
}

export async function removeModelsFromSkill(
  skillId: string,
  modelIds: string[],
): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].models.$delete({
    param: {
      skillId,
    },
    json: { modelIds },
  });

  if (!response.ok) {
    throw new Error('Failed to remove models from skill');
  }
}
