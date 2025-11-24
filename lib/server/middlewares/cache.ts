import type { CacheStorageConnector } from '@server/types/connector';
import type { AppContext, AppEnv } from '@server/types/hono';
import type {
  FunctionName,
  ReactiveAgentsRequestBody,
  ReactiveAgentsRequestData,
} from '@shared/types/api/request';
import type { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import {
  CacheMode,
  type CacheSettings,
  CacheStatus,
  type GetFromCacheResult,
} from '@shared/types/middleware/cache';
import type { Hook } from '@shared/types/middleware/hooks';
import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

async function produceAIProviderCacheKey(
  fn: FunctionName,
  raRequestBody: ReactiveAgentsRequestBody,
): Promise<string> {
  const stringToHash = `${fn}-${JSON.stringify(raRequestBody)}`;

  const encodedHash = new TextEncoder().encode(stringToHash);

  const cacheDigest = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    encodedHash,
  );

  return Array.from(new Uint8Array(cacheDigest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Cache Handling
const getAIProviderResponseFromCache = async (
  c: AppContext,
  cacheSettings: CacheSettings,
  raRequestData: ReactiveAgentsRequestData,
): Promise<GetFromCacheResult> => {
  const config = c.get('ra_config');

  if (config.force_refresh) {
    return { status: CacheStatus.REFRESH };
  } else if (cacheSettings.mode === CacheMode.DISABLED) {
    return { status: CacheStatus.DISABLED };
  }

  try {
    const cacheKey = await produceAIProviderCacheKey(
      raRequestData.functionName,
      raRequestData.requestBody,
    );

    let value: string | null = null;
    try {
      value = await c.get('cache_storage_connector').getCache(cacheKey);
    } catch (error) {
      console.error(error);
    }

    if (value) {
      return { value, status: CacheStatus.HIT, key: cacheKey };
    } else {
      return { status: CacheStatus.MISS };
    }
  } catch (error) {
    console.error(error);
    return { status: CacheStatus.MISS };
  }
};

const putAIProviderResponseInCache = async (
  connector: CacheStorageConnector,
  raRequestBody: ReactiveAgentsRequestBody,
  responseBody: Record<string, unknown>,
  fn: FunctionName,
): Promise<void> => {
  if (raRequestBody instanceof ReadableStream) {
    // Does not support caching of streams
    return;
  }

  const cacheKey = await produceAIProviderCacheKey(fn, raRequestBody);

  try {
    await connector.setCache(cacheKey, JSON.stringify(responseBody));
  } catch (error) {
    console.error(error);
  }
};

async function produceHookCacheKey(
  fn: FunctionName,
  hook: Hook,
  raRequestBody: ReactiveAgentsRequestBody,
  raResponseBody?: ReactiveAgentsResponseBody,
): Promise<string> {
  const stringToHash = `${fn}-${JSON.stringify(hook)}-${JSON.stringify(raRequestBody)}-${JSON.stringify(raResponseBody)}`;

  const encodedHash = new TextEncoder().encode(stringToHash);

  const cacheDigest = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    encodedHash,
  );

  return Array.from(new Uint8Array(cacheDigest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const getHookResponseFromCache = async (
  c: AppContext,
  hook: Hook,
  raRequestData: ReactiveAgentsRequestData,
  raResponseBody?: ReactiveAgentsResponseBody,
): Promise<GetFromCacheResult> => {
  const config = c.get('ra_config');

  if (config.force_hook_refresh) {
    return { status: CacheStatus.REFRESH };
  }

  try {
    const cacheKey = await produceHookCacheKey(
      raRequestData.functionName,
      hook,
      raRequestData.requestBody,
      raResponseBody,
    );

    let value: string | null = null;
    try {
      value = await c.get('cache_storage_connector').getCache(cacheKey);
    } catch (error) {
      console.error(error);
    }

    if (value) {
      return { value, status: CacheStatus.HIT, key: cacheKey };
    } else {
      return { status: CacheStatus.MISS };
    }
  } catch (error) {
    console.error(error);
    return { status: CacheStatus.MISS };
  }
};

/**
 * Middleware to handle caching of requests.
 */
export const cacheMiddleware = (
  factory: Factory<AppEnv>,
  connector: CacheStorageConnector,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    c.set('cache_storage_connector', connector);
    c.set('getAIProviderResponseFromCache', getAIProviderResponseFromCache);
    c.set('getHookResponseFromCache', getHookResponseFromCache);

    await next();

    const aiProviderLog = c.get('ai_provider_log');

    if (aiProviderLog) {
      if (aiProviderLog.status >= 400) {
        // Do not cache failed requests
        return;
      }

      if (
        aiProviderLog.cache_mode === CacheMode.SIMPLE &&
        aiProviderLog.response_body !== null
      ) {
        await putAIProviderResponseInCache(
          c.get('cache_storage_connector'),
          aiProviderLog.request_body,
          aiProviderLog.response_body,
          aiProviderLog.function_name,
        );
      }
    }
  });
