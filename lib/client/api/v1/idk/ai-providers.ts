import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  AIProviderConfig,
  type AIProviderConfigCreateParams,
  type AIProviderConfigQueryParams,
  type AIProviderConfigUpdateParams,
} from '@shared/types/data/ai-provider';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

// Schema types
export interface AIProviderSchemaResponse {
  hasCustomFields: boolean;
  schema?: Record<string, unknown>;
  isAPIKeyRequired: boolean;
}

export type AIProviderSchemasResponse = Record<
  string,
  AIProviderSchemaResponse
>;

// Schema endpoints
/**
 * Fetch all AI provider custom fields schemas
 */
export async function getAIProviderSchemas(): Promise<AIProviderSchemasResponse> {
  const response = await client.v1.idk['ai-providers'].schemas.$get();

  if (!response.ok) {
    throw new Error('Failed to fetch AI provider schemas');
  }

  return response.json();
}

/**
 * Fetch a specific AI provider's custom fields schema
 */
export async function getAIProviderSchema(
  provider: string,
): Promise<AIProviderSchemaResponse> {
  const response = await client.v1.idk['ai-providers'].schemas[
    ':provider'
  ].$get({
    param: { provider },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch schema for provider: ${provider}`);
  }

  return response.json();
}

// CRUD endpoints
export async function getAIProviderAPIKeys(
  params: AIProviderConfigQueryParams,
): Promise<AIProviderConfig[]> {
  const response = await client.v1.idk['ai-providers'].$get({
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

  return AIProviderConfig.array().parse(await response.json());
}

export async function createAIProvider(
  params: AIProviderConfigCreateParams,
): Promise<AIProviderConfig> {
  const response = await client.v1.idk['ai-providers'].$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create AI provider API key');
  }

  return AIProviderConfig.parse(await response.json());
}

export async function updateAIProvider(
  id: string,
  params: AIProviderConfigUpdateParams,
): Promise<AIProviderConfig> {
  const response = await client.v1.idk['ai-providers'][':id'].$patch({
    param: {
      id: id,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update AI provider API key');
  }

  return AIProviderConfig.parse(await response.json());
}

export async function deleteAIProvider(id: string): Promise<void> {
  const response = await client.v1.idk['ai-providers'][':id'].$delete({
    param: {
      id: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete AI provider API key');
  }
}
