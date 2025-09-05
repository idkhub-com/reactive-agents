import { HttpError } from '@server/errors/http';
import { responseHandler } from '@server/handlers/response-handler';
import type { AppContext } from '@server/types/hono';
import type { FunctionName } from '@shared/types/api/request';

import type { IdkRequestData } from '@shared/types/api/request/body';
import { ErrorResponseBody } from '@shared/types/api/response/body';

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

  // For error responses that have been properly processed, don't throw errors
  // They should be returned as proper HTTP responses with error information
  if (!mappedResponse.ok) {
    const responseBody = await mappedResponse.clone().text();

    // Parse the response body once and reuse the result
    let parsedBody: Record<string, unknown> | null = null;
    let isValidJson = false;
    try {
      parsedBody = JSON.parse(responseBody);
      isValidJson = true;
    } catch (error) {
      // If parsing fails, treat as unprocessed error
      console.error('Failed to parse response body as JSON:', error);
    }

    // Check if this is a properly processed error response using schema validation
    if (isValidJson && parsedBody) {
      try {
        const validationResult = ErrorResponseBody.safeParse(parsedBody);

        if (validationResult.success) {
          // This is a properly formatted ErrorResponseBody, return it as-is
          return mappedResponse;
        }
      } catch {
        // If import fails, fall back to basic check for backwards compatibility
        const hasBasicErrorStructure =
          typeof parsedBody === 'object' &&
          parsedBody !== null &&
          'error' in parsedBody &&
          'provider' in parsedBody &&
          typeof (parsedBody as Record<string, unknown>).error === 'object' &&
          typeof (parsedBody as Record<string, unknown>).provider === 'string';

        if (hasBasicErrorStructure) {
          return mappedResponse;
        }
      }
    }

    // For unprocessed errors, throw an HttpError
    let finalStatus = mappedResponse.status;
    if (
      isValidJson &&
      parsedBody &&
      parsedBody.status &&
      typeof parsedBody.status === 'number'
    ) {
      finalStatus = parsedBody.status;
    }

    const errorObj = new HttpError(responseBody, {
      status: finalStatus,
      statusText: mappedResponse.statusText,
      body: responseBody,
    });
    throw errorObj;
  }

  return mappedResponse;
}
