import { HttpMethod } from '@server/types/http';
import { IdkRequestLog } from '@shared/types/idkhub/observability';
import { CacheStatus } from '@shared/types/middleware/cache';

import { z } from 'zod';

export type LogMessage = {
  data: string;
  event: string;
  id: string;
};

export interface LogsClient {
  sendLog: (logMessage: LogMessage) => Promise<void>;
}

export const Log = IdkRequestLog;
export type Log = z.infer<typeof Log>;

export const LogsQueryParams = z.object({
  id: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).optional(),
  agent_id: z.string().uuid().optional(),
  skill_id: z.string().uuid().optional(),
  app_id: z.string().uuid().optional(),
  after: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
  before: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
  method: z.enum(HttpMethod).optional(),
  endpoint: z.string().optional(),
  function_name: z.string().optional(),
  status: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
  cache_status: z.enum(CacheStatus).optional(),
  limit: z.string().default('50').transform(Number).optional(),
  offset: z.string().default('0').transform(Number).optional(),
});

export type LogsQueryParams = z.infer<typeof LogsQueryParams>;
