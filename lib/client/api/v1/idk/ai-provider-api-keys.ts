import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  AIProviderAPIKey,
  type AIProviderAPIKeyCreateParams,
  type AIProviderAPIKeyQueryParams,
  type AIProviderAPIKeyUpdateParams,
} from '@shared/types/data/ai-provider-api-key';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function getAIProviderAPIKeys(
  params: AIProviderAPIKeyQueryParams,
): Promise<AIProviderAPIKey[]> {
  const response = await client.v1.idk['ai-provider-api-keys'].$get({
    query: {
      id: params.id,
      ai_provider: params.ai_provider,
      name: params.name,
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch AI provider API keys');
  }

  return AIProviderAPIKey.array().parse(await response.json());
}

export async function createAIProviderAPIKey(
  params: AIProviderAPIKeyCreateParams,
): Promise<AIProviderAPIKey> {
  const response = await client.v1.idk['ai-provider-api-keys'].$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create AI provider API key');
  }

  return AIProviderAPIKey.parse(await response.json());
}

export async function updateAIProviderAPIKey(
  id: string,
  params: AIProviderAPIKeyUpdateParams,
): Promise<AIProviderAPIKey> {
  const response = await client.v1.idk['ai-provider-api-keys'][':id'].$patch({
    param: {
      id: id,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update AI provider API key');
  }

  return AIProviderAPIKey.parse(await response.json());
}

export async function deleteAIProviderAPIKey(id: string): Promise<void> {
  const response = await client.v1.idk['ai-provider-api-keys'][':id'].$delete({
    param: {
      id: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete AI provider API key');
  }
}
