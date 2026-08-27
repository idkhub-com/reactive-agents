import type { CacheStorageConnector } from '@api/types/connector';
import type { AppContext, AppEnv } from '@api/types/hono';
import type {
  FunctionName,
  SuperAgentsRequestBody,
  SuperAgentsRequestData,
} from '@shared/types/api/request';
import type { SuperAgentsResponseBody } from '@shared/types/api/response';
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
  saRequestBody: SuperAgentsRequestBody,
): Promise<string> {
  const stringToHash = `${fn}-${JSON.stringify(saRequestBody)}`;

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
  saRequestData: SuperAgentsRequestData,
): Promise<GetFromCacheResult> => {
  const config = c.get('sa_config');

  if (config.force_refresh) {
    return { status: CacheStatus.REFRESH };
  } else if (cacheSettings.mode === CacheMode.DISABLED) {
    return { status: CacheStatus.DISABLED };
  }

  try {
    const cacheKey = await produceAIProviderCacheKey(
      saRequestData.functionName,
      saRequestData.requestBody,
    );

    let value: string | null = null;
    try {
      value = await c.get('cache_storage_connector').getCache(c, cacheKey);
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
  c: AppContext,
  connector: CacheStorageConnector,
  saRequestBody: SuperAgentsRequestBody,
  responseBody: Record<string, unknown>,
  fn: FunctionName,
): Promise<void> => {
  if (saRequestBody instanceof ReadableStream) {
    // Does not support caching of streams
    return;
  }

  const cacheKey = await produceAIProviderCacheKey(fn, saRequestBody);

  try {
    await connector.setCache(c, cacheKey, JSON.stringify(responseBody));
  } catch (error) {
    console.error(error);
  }
};

async function produceHookCacheKey(
  fn: FunctionName,
  hook: Hook,
  saRequestBody: SuperAgentsRequestBody,
  saResponseBody?: SuperAgentsResponseBody,
): Promise<string> {
  const stringToHash = `${fn}-${JSON.stringify(hook)}-${JSON.stringify(saRequestBody)}-${JSON.stringify(saResponseBody)}`;

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
  saRequestData: SuperAgentsRequestData,
  saResponseBody?: SuperAgentsResponseBody,
): Promise<GetFromCacheResult> => {
  const config = c.get('sa_config');

  if (config.force_hook_refresh) {
    return { status: CacheStatus.REFRESH };
  }

  try {
    const cacheKey = await produceHookCacheKey(
      saRequestData.functionName,
      hook,
      saRequestData.requestBody,
      saResponseBody,
    );

    let value: string | null = null;
    try {
      value = await c.get('cache_storage_connector').getCache(c, cacheKey);
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
  resolve: (c: AppContext) => CacheStorageConnector,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    c.set('cache_storage_connector', resolve(c));
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
          c,
          c.get('cache_storage_connector'),
          aiProviderLog.request_body,
          aiProviderLog.response_body,
          aiProviderLog.function_name,
        );
      }
    }
  });
