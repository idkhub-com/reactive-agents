import type { HooksConnector } from '@server/types/connector';
import type { AppContext, AppEnv } from '@server/types/hono';
import type { IdkRequestData } from '@shared/types/api/request/body';
import { FunctionName } from '@shared/types/api/request/function-name';
import type { IdkConfig } from '@shared/types/api/request/headers';
import type { IdkResponseBody } from '@shared/types/api/response/body';
import type { HookLog } from '@shared/types/data';

import { CacheStatus } from '@shared/types/middleware/cache';
import {
  type Hook,
  HookResult,
  HookType,
} from '@shared/types/middleware/hooks';
import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

async function executeHookByProvider(
  c: AppContext,
  hook: Hook,
): Promise<HookResult> {
  try {
    const hookConnectorsMap = c.get('hooks_connectors_map');
    const result: HookResult =
      await hookConnectorsMap[hook.hook_provider].executeHook(hook);
    return {
      deny_request: result.deny_request,
      request_body_override: result.request_body_override,
      response_body_override: result.response_body_override,
      skipped: result.skipped,
    };
  } catch (err: unknown) {
    console.error(`Error executing hook "${hook.id}":`, err);
    return {
      deny_request: false,
      request_body_override: undefined,
      response_body_override: undefined,
      skipped: false,
    };
  }
}

function shouldSkipHook(
  hook: Hook,
  fn: FunctionName,
  statusCode: number | null,
  isStreamingRequest: boolean,
  idkResponseBody?: IdkResponseBody | ReadableStream | FormData | ArrayBuffer,
): boolean {
  return (
    ![
      FunctionName.CHAT_COMPLETE,
      FunctionName.COMPLETE,
      FunctionName.EMBED,
    ].includes(fn) ||
    (fn === FunctionName.EMBED && hook.type !== HookType.INPUT_HOOK) ||
    (hook.type === HookType.OUTPUT_HOOK && statusCode !== 200) ||
    (hook.type === HookType.OUTPUT_HOOK &&
      isStreamingRequest &&
      !idkResponseBody)
  );
}

async function executeHook(
  c: AppContext,
  hook: Hook,
  statusCode: number | null,
  isStreamingRequest: boolean,
  idkRequestData: IdkRequestData,
  idkResponseBody?: IdkResponseBody,
): Promise<{
  hookResult: HookResult;
  cacheStatus: CacheStatus;
}> {
  if (
    shouldSkipHook(
      hook,
      idkRequestData.functionName,
      statusCode,
      isStreamingRequest,
      idkResponseBody,
    )
  ) {
    const hookResult: HookResult = {
      deny_request: false,
      request_body_override: undefined,
      response_body_override: undefined,
      skipped: true,
    };
    return {
      hookResult,
      cacheStatus: CacheStatus.DISABLED,
    };
  }

  const idkConfig = c.get('idk_config');

  let cacheStatus = CacheStatus.MISS;
  if (!idkConfig.force_hook_refresh) {
    const getHookResponseFromCache = c.get('getHookResponseFromCache');

    const cacheResult = await getHookResponseFromCache(
      c,
      hook,
      idkRequestData,
      idkResponseBody,
    );

    if (cacheResult.status === CacheStatus.HIT) {
      return {
        hookResult: HookResult.parse(cacheResult.value),
        cacheStatus: cacheResult.status,
      };
    }

    cacheStatus = cacheResult.status;
  } else {
    cacheStatus = CacheStatus.REFRESH;
  }

  const result = await executeHookByProvider(c, hook);

  return {
    hookResult: result,
    cacheStatus,
  };
}

function getHooksToExecute(config: IdkConfig, hookType: HookType): Hook[] {
  const hooksToExecute: Hook[] = [];
  hooksToExecute.push(...config.hooks.filter((h) => h.type === hookType));

  return hooksToExecute;
}

export async function executeHooks(
  c: AppContext,
  hookType: HookType,
  statusCode: number | null,
  isStreamingRequest: boolean,
  idkRequestData: IdkRequestData,
  idkResponseBody?: IdkResponseBody,
): Promise<HookLog[]> {
  const idkConfig = c.get('idk_config');

  const hooksToExecute = getHooksToExecute(idkConfig, hookType);

  if (hooksToExecute.length === 0) {
    return [];
  }

  try {
    const results = await Promise.all(
      hooksToExecute.map(async (hook) => {
        const startTime = Date.now();
        const { hookResult, cacheStatus } = await executeHook(
          c,
          hook,
          statusCode,
          isStreamingRequest,
          idkRequestData,
          idkResponseBody,
        );
        const endTime = Date.now();
        const duration = endTime - startTime;

        const hookLog: HookLog = {
          trace_id: idkConfig.trace_id,
          hook: hook,
          result: hookResult,
          start_time: startTime,
          end_time: endTime,
          duration: duration,
          cache_status: cacheStatus,
        };

        const currentHookLogs = c.get('hook_logs') || [];
        c.set('hook_logs', [...currentHookLogs, hookLog]);

        return hookLog;
      }),
    );

    return results;
  } catch (err) {
    console.error(`Error executing hooks:`, err);
    return [];
  }
}

/**
 * Middleware to handle hooks.
 */
export const hooksMiddleware = (
  factory: Factory<AppEnv>,
  connectors: HooksConnector[],
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    const hookConnectorsMap: Record<string, HooksConnector> = {};

    for (const connector of connectors) {
      hookConnectorsMap[connector.name] = connector;
    }

    c.set('hooks_connectors_map', hookConnectorsMap);

    c.set('executeHooks', executeHooks);

    await next();
  });
