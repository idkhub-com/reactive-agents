import type {
  CacheStorageConnector,
  EvaluationMethodConnector,
  HooksConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@api/types/connector';
import type { SuperAgentsRequestData } from '@shared/types/api/request';
import type {
  SuperAgentsConfig,
  SuperAgentsConfigPreProcessed,
} from '@shared/types/api/request/headers';
import type { SuperAgentsResponseBody } from '@shared/types/api/response';
import type { SkillOptimizationArm } from '@shared/types/data';
import type { Agent } from '@shared/types/data/agent';
import type {
  AIProviderRequestLog,
  HookLog,
  LogsClient,
} from '@shared/types/data/log';
import type { Skill } from '@shared/types/data/skill';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import type {
  CacheSettings,
  GetFromCacheResult,
} from '@shared/types/middleware/cache';
import type { Hook, HookType } from '@shared/types/middleware/hooks';
import type { Context, Hono } from 'hono';

export interface AppEnv {
  Bindings: {
    ACCESS_PASSWORD?: string;
    AI_PROVIDER_API_KEY_ENCRYPTION_KEY?: string;
    API_URL?: string;
    AUTH_JWT_SECRET?: string;
    BEARER_TOKEN?: string;
    LIBSQL_AUTH_TOKEN?: string;
    LIBSQL_URL?: string;
    NODE_ENV?: string;
    POSTGREST_SERVICE_ROLE_KEY?: string;
    POSTGREST_URL?: string;
    SUPABASE_SECRET_KEY?: string;
    SUPABASE_URL?: string;
    WEB_APP_URL?: string;
  };
  Variables: {
    sa_config: SuperAgentsConfig;
    sa_config_pre_processed: SuperAgentsConfigPreProcessed;
    sa_request_data: SuperAgentsRequestData;
    embedding: number[] | null;
    agent: Agent;
    skill: Skill;
    pulled_arm?: SkillOptimizationArm;
    ai_provider_log?: AIProviderRequestLog;
    hook_logs?: HookLog[];
    first_token_time?: number;
    stream_end_time?: number;
    stream_end_promise?: Promise<void>;
    accumulated_stream_chunks?: string;
    cache_storage_connector: CacheStorageConnector;
    logs_storage_connector: LogsStorageConnector;
    user_data_storage_connector: UserDataStorageConnector;
    websocket_error?: boolean;
    addLogsClient: (clientId: string, client: LogsClient) => void;
    removeLogsClient: (clientId: string) => void;
    hooks_connectors_map: Record<string, HooksConnector>;
    evaluation_connectors_map: Record<
      EvaluationMethodName,
      EvaluationMethodConnector
    >;

    executeHooks: (
      c: AppContext,
      hookType: HookType,
      statusCode: number | null,
      isStreamingRequest: boolean,
      saRequestData: SuperAgentsRequestData,
      saResponseBody?: SuperAgentsResponseBody,
    ) => Promise<HookLog[]>;
    getAIProviderResponseFromCache: (
      c: AppContext,
      cacheSettings: CacheSettings,
      saRequestData: SuperAgentsRequestData,
    ) => Promise<GetFromCacheResult>;
    getHookResponseFromCache: (
      c: AppContext,
      hook: Hook,
      saRequestData: SuperAgentsRequestData,
      saResponseBody?: SuperAgentsResponseBody,
    ) => Promise<GetFromCacheResult>;
    putHookResponsesInCache: (
      c: AppContext,
      hookLogs: HookLog[],
    ) => Promise<void>;
  };
}

export interface AppContext extends Context<AppEnv> {}

export interface AppHono extends Hono<AppEnv, { [k: string]: never }, '/v1'> {}
