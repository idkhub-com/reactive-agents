import { HttpMethod } from '@server/types/http';
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

export const LogsQueryParams = z.object({
  id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional(),
  skill_id: z.string().uuid().optional(),
  app_id: z.string().optional(),
  after: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  before: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  method: z.nativeEnum(HttpMethod).optional(),
  endpoint: z.string().optional(),
  function_name: z.string().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  cache_status: z.nativeEnum(CacheStatus).optional(),
  limit: z.string().optional().default('50').transform(Number),
  offset: z.string().optional().default('0').transform(Number),
});

export type LogsQueryParams = z.infer<typeof LogsQueryParams>;
