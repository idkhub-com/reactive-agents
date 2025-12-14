import { API_URL } from '@client/constants';
import type { ReactiveAgentsRoute } from '@server/api/v1';
import {
  Model,
  type ModelCreateParams,
  type ModelQueryParams,
  type ModelUpdateParams,
} from '@shared/types/data/model';
import { hc } from 'hono/client';

const client = hc<ReactiveAgentsRoute>(API_URL);

export async function getModels(params?: ModelQueryParams): Promise<Model[]> {
  const response = await client.v1['reactive-agents'].models.$get({
    query: {
      id: params?.id,
      ai_provider_id: params?.ai_provider_id,
      model_name: params?.model_name,
      limit: params?.limit?.toString(),
      offset: params?.offset?.toString(),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error || 'Failed to fetch models');
  }

  return Model.array().parse(data);
}

export async function getModelById(id: string): Promise<Model> {
  const response = await client.v1['reactive-agents'].models[':id'].$get({
    param: {
      id,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error || 'Failed to fetch model');
  }

  return Model.parse(data);
}

export async function createModel(model: ModelCreateParams): Promise<Model> {
  const response = await client.v1['reactive-agents'].models.$post({
    json: model,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error || 'Failed to create model');
  }

  return Model.parse(data);
}

export async function updateModel(
  id: string,
  update: ModelUpdateParams,
): Promise<Model> {
  const response = await client.v1['reactive-agents'].models[':id'].$patch({
    param: {
      id,
    },
    json: update,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error || 'Failed to update model');
  }

  return Model.parse(data);
}

export async function deleteModel(id: string): Promise<void> {
  const response = await client.v1['reactive-agents'].models[':id'].$delete({
    param: {
      id,
    },
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error || 'Failed to delete model');
  }
}
