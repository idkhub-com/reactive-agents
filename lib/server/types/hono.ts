import type {
  CacheStorageConnector,
  EvaluationMethodConnector,
  HooksConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { IdkRequestData } from '@shared/types/api/request';
import type {
  IdkConfig,
  IdkConfigPreProcessed,
} from '@shared/types/api/request/headers';
import type { IdkResponseBody } from '@shared/types/api/response';
import type { SkillOptimizationArm } from '@shared/types/data';
import type { Agent } from '@shared/types/data/agent';
import type { LogsClient } from '@shared/types/data/log';
import type { Skill } from '@shared/types/data/skill';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type {
  AIProviderRequestLog,
  HookLog,
} from '@shared/types/idkhub/observability';
import type {
  CacheSettings,
  GetFromCacheResult,
} from '@shared/types/middleware/cache';
import type { Hook, HookType } from '@shared/types/middleware/hooks';
import type { Context, Hono } from 'hono';

export interface AppEnv {
  Variables: {
    idk_config: IdkConfig;
    idk_config_pre_processed: IdkConfigPreProcessed;
    idk_request_data: IdkRequestData;
    embedding: number[] | null;
    agent: Agent;
    skill: Skill;
    pulled_arm?: SkillOptimizationArm;
    ai_provider_log?: AIProviderRequestLog;
    hook_logs?: HookLog[];
    cache_storage_connector: CacheStorageConnector;
    logs_storage_connector: LogsStorageConnector;
    user_data_storage_connector: UserDataStorageConnector;
    websocket_error?: boolean;
    addLogsClient: (clientId: string, client: LogsClient) => void;
    removeLogsClient: (clientId: string) => void;
    hooks_connectors_map: Record<string, HooksConnector>;
    evaluation_connectors_map: Partial<
      Record<EvaluationMethodName, EvaluationMethodConnector>
    >;
    executeHooks: (
      c: AppContext,
      hookType: HookType,
      statusCode: number | null,
      isStreamingRequest: boolean,
      idkRequestData: IdkRequestData,
      idkResponseBody?: IdkResponseBody,
    ) => Promise<HookLog[]>;
    getAIProviderResponseFromCache: (
      c: AppContext,
      cacheSettings: CacheSettings,
      idkRequestData: IdkRequestData,
    ) => Promise<GetFromCacheResult>;
    getHookResponseFromCache: (
      c: AppContext,
      hook: Hook,
      idkRequestData: IdkRequestData,
      idkResponseBody?: IdkResponseBody,
    ) => Promise<GetFromCacheResult>;
    putHookResponsesInCache: (
      c: AppContext,
      hookLogs: HookLog[],
    ) => Promise<void>;
  };
}

export interface AppContext extends Context<AppEnv> {}

export interface AppHono extends Hono<AppEnv, { [k: string]: never }, '/v1'> {}
