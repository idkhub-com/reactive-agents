import { HttpError } from '@server/errors/http';
import { responseHandler } from '@server/handlers/response-handler';
import type { AppContext } from '@server/types/hono';
import type { FunctionName } from '@shared/types/api/request';

import type { IdkRequestData } from '@shared/types/api/request/body';

import type { AIProvider } from '@shared/types/constants';
import type { AIProviderRequestLog } from '@shared/types/idkhub/observability';
import type {
  CacheSettings,
  CacheStatus,
} from '@shared/types/middleware/cache';

export interface CommonRequestOptions {
  idkRequestData: IdkRequestData;
  aiProviderRequestURL: string;
  isStreamingMode: boolean;
  provider: AIProvider;
  strictOpenAiCompliance: boolean;
  areSyncHooksAvailable: boolean;
  currentIndex: number | string;
  fetchOptions: RequestInit;
  cacheSettings: CacheSettings;
}

export interface CreateResponseOptions extends CommonRequestOptions {
  response: Response;
  responseTransformerFunctionName: FunctionName | undefined;
  cacheStatus: CacheStatus;
  retryCount: number | undefined;
  aiProviderRequestBody:
    | Record<string, unknown>
    | ReadableStream
    | FormData
    | ArrayBuffer
    | null;
  cacheKey?: string;
}

export async function createResponse(
  c: AppContext,
  options: CreateResponseOptions,
): Promise<Response> {
  const { response: mappedResponse } = await responseHandler(
    options.response,
    options.isStreamingMode,
    options.provider,
    options.responseTransformerFunctionName,
    options.aiProviderRequestURL,
    options.cacheStatus,
    options.idkRequestData,
    options.strictOpenAiCompliance,
    options.areSyncHooksAvailable,
  );

  const mappedResponseClone = mappedResponse.clone();
  const mappedResponseCloneText = await mappedResponseClone.text();
  const mappedResponseCloneJson = JSON.parse(mappedResponseCloneText);
  if (options.idkRequestData.requestBody instanceof ReadableStream) {
    throw new Error('ReadableStream is not supported');
  } else if (options.idkRequestData.requestBody instanceof FormData) {
    throw new Error('FormData is not supported');
  } else if (options.idkRequestData.requestBody instanceof ArrayBuffer) {
    throw new Error('ArrayBuffer is not supported');
  }

  const aiProviderLog: AIProviderRequestLog = {
    provider: options.provider,
    function_name: options.idkRequestData.functionName,
    method: options.idkRequestData.method,
    request_url: options.idkRequestData.url,
    status: mappedResponse.status,
    request_body: options.idkRequestData.requestBody,
    response_body: mappedResponseCloneJson,
    raw_request_body: JSON.stringify(options.idkRequestData.requestBody),
    raw_response_body: mappedResponseCloneText,
    cache_status: options.cacheStatus,
    cache_mode: options.cacheSettings.mode,
  };

  c.set('ai_provider_log', aiProviderLog);

  // If the response was not ok, throw an error
  if (!mappedResponse.ok) {
    const errorObj = new HttpError(await mappedResponse.clone().text(), {
      status: mappedResponse.status,
      statusText: mappedResponse.statusText,
      body: await mappedResponse.text(),
    });
    throw errorObj;
  }

  return mappedResponse;
}
