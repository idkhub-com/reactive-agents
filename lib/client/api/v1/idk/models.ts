import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  Model,
  type ModelCreateParams,
  type ModelQueryParams,
  type ModelUpdateParams,
} from '@shared/types/data/model';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function getModels(params?: ModelQueryParams): Promise<Model[]> {
  const response = await client.v1.idk.models.$get({
    query: {
      id: params?.id,
      ai_provider_api_key_id: params?.ai_provider_api_key_id,
      model_name: params?.model_name,
      limit: params?.limit?.toString(),
      offset: params?.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  return Model.array().parse(await response.json());
}

export async function getModelById(id: string): Promise<Model> {
  const response = await client.v1.idk.models[':id'].$get({
    param: {
      id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch model');
  }

  return Model.parse(await response.json());
}

export async function createModel(model: ModelCreateParams): Promise<Model> {
  const response = await client.v1.idk.models.$post({
    json: model,
  });

  if (!response.ok) {
    throw new Error('Failed to create model');
  }

  return Model.parse(await response.json());
}

export async function updateModel(
  id: string,
  update: ModelUpdateParams,
): Promise<Model> {
  const response = await client.v1.idk.models[':id'].$patch({
    param: {
      id,
    },
    json: update,
  });

  if (!response.ok) {
    throw new Error('Failed to update model');
  }

  return Model.parse(await response.json());
}

export async function deleteModel(id: string): Promise<void> {
  const response = await client.v1.idk.models[':id'].$delete({
    param: {
      id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete model');
  }
}
