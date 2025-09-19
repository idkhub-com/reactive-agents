import { z } from 'zod';

export const AIProviderAPIKey = z.object({
  id: z.string(),
  ai_provider: z.string(),
  name: z.string(),
  api_key: z.string(),
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

export const AIProviderAPIKeyCreateParams = z
  .object({
    ai_provider: z.string().min(1),
    name: z.string().min(1),
    api_key: z.string().min(1),
  })
  .strict();

export type AIProviderAPIKeyCreateParams = z.infer<
  typeof AIProviderAPIKeyCreateParams
>;

export const AIProviderAPIKeyUpdateParams = z
  .object({
    ai_provider: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    api_key: z.string().min(1).optional(),
  })
  .strict();

export type AIProviderAPIKeyUpdateParams = z.infer<
  typeof AIProviderAPIKeyUpdateParams
>;
