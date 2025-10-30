import type {
  CacheStorageConnector,
  EvaluationMethodConnector,
  HooksConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request';
import type {
  ReactiveAgentsConfig,
  ReactiveAgentsConfigPreProcessed,
} from '@shared/types/api/request/headers';
import type { ReactiveAgentsResponseBody } from '@shared/types/api/response';
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
  Variables: {
    ra_config: ReactiveAgentsConfig;
    ra_config_pre_processed: ReactiveAgentsConfigPreProcessed;
    ra_request_data: ReactiveAgentsRequestData;
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
    evaluation_connectors_map: Record<
      EvaluationMethodName,
      EvaluationMethodConnector
    >;

    executeHooks: (
      c: AppContext,
      hookType: HookType,
      statusCode: number | null,
      isStreamingRequest: boolean,
      raRequestData: ReactiveAgentsRequestData,
      raResponseBody?: ReactiveAgentsResponseBody,
    ) => Promise<HookLog[]>;
    getAIProviderResponseFromCache: (
      c: AppContext,
      cacheSettings: CacheSettings,
      raRequestData: ReactiveAgentsRequestData,
    ) => Promise<GetFromCacheResult>;
    getHookResponseFromCache: (
      c: AppContext,
      hook: Hook,
      raRequestData: ReactiveAgentsRequestData,
      raResponseBody?: ReactiveAgentsResponseBody,
    ) => Promise<GetFromCacheResult>;
    putHookResponsesInCache: (
      c: AppContext,
      hookLogs: HookLog[],
    ) => Promise<void>;
  };
}

export interface AppContext extends Context<AppEnv> {}

export interface AppHono extends Hono<AppEnv, { [k: string]: never }, '/v1'> {}
