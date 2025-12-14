import { z } from 'zod';

/**
 * AI Provider Config schema for database records
 * Represents a configured AI provider instance (ai_providers table)
 * @property {string} id - Unique identifier
 * @property {string} ai_provider - AI provider identifier (e.g., 'ollama', 'openai')
 * @property {string} name - User-defined name for the AI provider
 * @property {string} api_key - Encrypted API key value
 * @property {Record<string, unknown>} custom_fields - Dynamic JSONB object for provider-specific configuration.
 *   Can include custom_host, api_version, custom_endpoint, or any other provider-specific settings.
 *   Examples: { "custom_host": "http://localhost:8080" }, { "api_version": "v2", "region": "us-east-1" }
 *   SECURITY: Values should be validated by the specific provider implementation at runtime.
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 */
export const AIProviderConfig = z.object({
  id: z.string(),
  ai_provider: z.string(),
  name: z.string(),
  api_key: z.string().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfig>;

export const AIProviderConfigQueryParams = z
  .object({
    id: z.string().optional(),
    ai_provider: z.string().optional(),
    name: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type AIProviderConfigQueryParams = z.infer<
  typeof AIProviderConfigQueryParams
>;

/**
 * Parameters for creating a new AI Provider Config
 * @property {string} ai_provider - AI provider identifier (required)
 * @property {string} name - User-defined name for the AI provider (required)
 * @property {string} [api_key] - API key value (optional for self-hosted providers)
 * @property {Record<string, unknown>} [custom_fields] - Optional dynamic fields for provider-specific configuration.
 *   Can include custom_host, api_version, custom_endpoint, or any other provider-specific settings.
 */
export const AIProviderConfigCreateParams = z
  .object({
    ai_provider: z.string().min(1),
    name: z.string().min(1),
    api_key: z.string().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .strict();

export type AIProviderConfigCreateParams = z.infer<
  typeof AIProviderConfigCreateParams
>;

/**
 * Parameters for updating an existing AI Provider Config
 * @property {string} [ai_provider] - AI provider identifier
 * @property {string} [name] - User-defined name for the AI provider
 * @property {string} [api_key] - API key value (only included if being updated)
 * @property {Record<string, unknown>} [custom_fields] - Dynamic fields for provider-specific configuration.
 *   Can include custom_host, api_version, custom_endpoint, or any other provider-specific settings.
 */
export const AIProviderConfigUpdateParams = z
  .object({
    ai_provider: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    api_key: z.string().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type AIProviderConfigUpdateParams = z.infer<
  typeof AIProviderConfigUpdateParams
>;
