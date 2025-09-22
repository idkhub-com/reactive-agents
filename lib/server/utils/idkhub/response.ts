import { responseHandler } from '@server/handlers/response-handler';
import type { AppContext } from '@server/types/hono';
import type { FunctionName } from '@shared/types/api/request';

/**
 * Sanitizes error messages to prevent exposure of sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potential API keys, tokens, and other sensitive data
  return message
    .replace(
      /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9_-]+/gi,
      'api_key: [REDACTED]',
    )
    .replace(/token["\s]*[:=]["\s]*[a-zA-Z0-9_-]+/gi, 'token: [REDACTED]')
    .replace(/password["\s]*[:=]["\s]*[a-zA-Z0-9_-]+/gi, 'password: [REDACTED]')
    .replace(/secret["\s]*[:=]["\s]*[a-zA-Z0-9_-]+/gi, 'secret: [REDACTED]')
    .replace(/bearer["\s]+[a-zA-Z0-9_-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /authorization["\s]*[:=]["\s]*[a-zA-Z0-9_-]+/gi,
      'Authorization: [REDACTED]',
    );
}

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
  let mappedResponseCloneJson: unknown;
  try {
    mappedResponseCloneJson = JSON.parse(mappedResponseCloneText);
  } catch {
    // If JSON parsing fails, use the text as the response body
    mappedResponseCloneJson = { message: mappedResponseCloneText };
  }
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
    response_body: mappedResponseCloneJson as Record<string, unknown>,
    raw_request_body: JSON.stringify(options.idkRequestData.requestBody),
    raw_response_body: mappedResponseCloneText,
    cache_status: options.cacheStatus,
    cache_mode: options.cacheSettings.mode,
  };

  c.set('ai_provider_log', aiProviderLog);

  // Return the response directly, whether it's successful or an error
  // Error responses should be returned to the client, not thrown as exceptions
  return mappedResponse;
}
