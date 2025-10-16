import { z } from 'zod';

/**
 * AI Provider API Key schema for database records
 * @property {string} id - Unique identifier
 * @property {string} ai_provider - AI provider identifier (e.g., 'ollama', 'openai')
 * @property {string} name - User-defined name for the API key
 * @property {string} api_key - Encrypted API key value
 * @property {string | null | undefined} custom_host - Optional custom host URL for self-hosted providers.
 *   Must use HTTP or HTTPS protocol. Used for providers like Ollama that support both
 *   cloud-hosted and self-hosted instances.
 *   Examples: "http://localhost:8080", "https://api.example.com", "http://192.168.1.100:8080"
 *   SECURITY: Validated on both client and server to prevent SSRF attacks. Additional
 *   provider-specific validation (hostname, port, path) is performed at runtime.
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 */
export const AIProviderAPIKey = z.object({
  id: z.string(),
  ai_provider: z.string(),
  name: z.string(),
  api_key: z.string().nullable(),
  custom_host: z
    .string()
    .url('Please enter a valid URL')
    .max(2048, 'URL is too long (maximum 2048 characters)')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'Custom host must use HTTP or HTTPS protocol',
    )
    .nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AIProviderAPIKey = z.infer<typeof AIProviderAPIKey>;

export const AIProviderAPIKeyQueryParams = z
  .object({
    id: z.string().optional(),
    ai_provider: z.string().optional(),
    name: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type AIProviderAPIKeyQueryParams = z.infer<
  typeof AIProviderAPIKeyQueryParams
>;

/**
 * Parameters for creating a new AI Provider API Key
 * @property {string} ai_provider - AI provider identifier (required)
 * @property {string} name - User-defined name for the API key (required)
 * @property {string} [api_key] - API key value (optional for self-hosted providers)
 * @property {string} [custom_host] - Optional custom host URL for self-hosted instances.
 *   Must be a valid HTTP or HTTPS URL.
 */
export const AIProviderAPIKeyCreateParams = z
  .object({
    ai_provider: z.string().min(1),
    name: z.string().min(1),
    api_key: z.string().nullable().optional(),
    custom_host: z
      .string()
      .url('Please enter a valid URL')
      .max(2048, 'URL is too long (maximum 2048 characters)')
      .refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        'Custom host must use HTTP or HTTPS protocol',
      )
      .nullish(),
  })
  .strict();

export type AIProviderAPIKeyCreateParams = z.infer<
  typeof AIProviderAPIKeyCreateParams
>;

/**
 * Parameters for updating an existing AI Provider API Key
 * @property {string} [ai_provider] - AI provider identifier
 * @property {string} [name] - User-defined name for the API key
 * @property {string} [api_key] - API key value (only included if being updated)
 * @property {string} [custom_host] - Custom host URL for self-hosted instances.
 *   Must be a valid HTTP or HTTPS URL.
 */
export const AIProviderAPIKeyUpdateParams = z
  .object({
    ai_provider: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    api_key: z.string().nullable().optional(),
    custom_host: z
      .string()
      .url('Please enter a valid URL')
      .max(2048, 'URL is too long (maximum 2048 characters)')
      .refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        'Custom host must use HTTP or HTTPS protocol',
      )
      .nullish(),
  })
  .strict();

export type AIProviderAPIKeyUpdateParams = z.infer<
  typeof AIProviderAPIKeyUpdateParams
>;
