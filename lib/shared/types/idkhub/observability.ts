import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';

import { AIProvider } from '@shared/types/constants';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { Hook, HookResult } from '@shared/types/middleware/hooks';
import { z } from 'zod';

export const LogResponseBodyError = z.object({
  message: z.string(),
  response: z.string(),
});

export type LogResponseBodyError = z.infer<typeof LogResponseBodyError>;

export const AIProviderRequestLog = z.object({
  provider: z.enum(AIProvider),
  function_name: z.enum(FunctionName),
  method: z.enum(HttpMethod),
  request_url: z.string(),
  status: z.number(),
  request_body: z.record(z.string(), z.unknown()),
  response_body: z.record(z.string(), z.unknown()),
  raw_request_body: z.string(),
  raw_response_body: z.string(),
  cache_mode: z.enum(CacheMode),
  cache_status: z.enum(CacheStatus),
});

export type AIProviderRequestLog = z.infer<typeof AIProviderRequestLog>;

export const HookLog = z.object({
  trace_id: z.string(),
  hook: Hook,
  result: HookResult,
  request_body: z.record(z.string(), z.unknown()).optional(),
  response_body: z.record(z.string(), z.unknown()).optional(),
  start_time: z.number(),
  end_time: z.number(),
  duration: z.number(),
  cache_status: z.enum(CacheStatus),
});

export type HookLog = z.infer<typeof HookLog>;

export const IdkRequestLog = z.object({
  // Base info
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  method: z.enum(HttpMethod),
  endpoint: z.string(),
  function_name: z.enum(FunctionName),
  status: z.number(),
  start_time: z.number(),
  end_time: z.number(),
  duration: z.number(),
  base_idk_config: z.record(z.string(), z.unknown()),

  // Maybe redundant. Used for indexing.
  ai_provider: z.enum(AIProvider),
  model: z.string(),

  // Main data
  ai_provider_request_log: AIProviderRequestLog,
  hook_logs: z.array(HookLog),
  metadata: z.record(z.string(), z.unknown()),

  // Cache info
  cache_status: z.enum(CacheStatus),

  // Tracing info
  trace_id: z.string().nullable().default(null),
  parent_span_id: z.string().nullable().default(null),
  span_id: z.string().nullable().default(null),
  span_name: z.string().nullable().default(null),

  // User metadata
  app_id: z.string().nullable().default(null),
  external_user_id: z.string().nullable().default(null),
  external_user_human_name: z.string().nullable().default(null),
  user_metadata: z.record(z.string(), z.unknown()).nullable().default(null),
});

export type IdkRequestLog = z.infer<typeof IdkRequestLog>;
