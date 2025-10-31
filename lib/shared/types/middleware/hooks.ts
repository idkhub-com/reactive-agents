import { HttpMethod } from '@server/types/http';
import { ReactiveAgentsRequestBody } from '@shared/types/api/request';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';

import { AIProvider } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import { z } from 'zod';

export enum HookType {
  INPUT_HOOK = 'input',
  OUTPUT_HOOK = 'output',
}

export const HookHttpProviderConfig = z.object({
  method: z.enum(HttpMethod),
  url: z.string(),
});

export type HookHttpProviderConfig = z.infer<typeof HookHttpProviderConfig>;

export const HookLLMProviderConfig = z.object({
  model: z.string(),
  provider: z.enum(AIProvider),
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
  type: z.enum(HookType),
  hook_provider: z.enum(HookProvider),
  config: z.union([HookHttpProviderConfig, HookLLMProviderConfig]),
  await: z.boolean().optional().default(true),
  cache_mode: z.enum(CacheMode).default(CacheMode.DISABLED),
});

export type Hook = z.infer<typeof Hook>;

export const HookResult = z.object({
  deny_request: z.boolean(),
  request_body_override: ReactiveAgentsRequestBody.optional(),
  response_body_override: ReactiveAgentsResponseBody.optional(),
  skipped: z.boolean(),
});

export type HookResult = z.infer<typeof HookResult>;
