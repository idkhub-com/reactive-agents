import { HttpMethod } from '@server/types/http';
import { IdkRequestBody } from '@shared/types/api/request';
import { IdkResponseBody } from '@shared/types/api/response';

import { AIProvider } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import { z } from 'zod';

export enum HookType {
  INPUT_HOOK = 'input',
  OUTPUT_HOOK = 'output',
}

export const HookHttpProviderConfig = z.object({
  method: z.nativeEnum(HttpMethod),
  url: z.string(),
});

export type HookHttpProviderConfig = z.infer<typeof HookHttpProviderConfig>;

export const HookLLMProviderConfig = z.object({
  model: z.string(),
  provider: z.nativeEnum(AIProvider),
  body: z.record(z.string(), z.unknown()).optional(),
});

export type HookLLMProviderConfig = z.infer<typeof HookLLMProviderConfig>;

export enum HookProviderSource {
  DEFAULT = 'default',
}

export enum HookProvider {
  HTTP = 'http',
  LLM = 'llm',
}

export const Hook = z.object({
  id: z.string(),
  type: z.nativeEnum(HookType),
  hook_provider: z.nativeEnum(HookProvider),
  config: z.union([HookHttpProviderConfig, HookLLMProviderConfig]),
  await: z.boolean().optional().default(true),
  cache_mode: z.nativeEnum(CacheMode).default(CacheMode.DISABLED),
});

export type Hook = z.infer<typeof Hook>;

export const HookResult = z.object({
  deny_request: z.boolean(),
  request_body_override: IdkRequestBody.optional(),
  response_body_override: IdkResponseBody.optional(),
  skipped: z.boolean(),
});

export type HookResult = z.infer<typeof HookResult>;
