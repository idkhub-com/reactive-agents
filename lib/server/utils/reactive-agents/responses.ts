import { HttpError } from '@server/errors/http';
import { responseHandler } from '@server/handlers/response-handler';
import type { AppContext } from '@server/types/hono';
import type { FunctionName } from '@shared/types/api/request';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import type { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type { AIProvider } from '@shared/types/constants';
import type { AIProviderRequestLog } from '@shared/types/data';
import type {
  CacheSettings,
  CacheStatus,
} from '@shared/types/middleware/cache';

export interface CommonRequestOptions {
  raRequestData: ReactiveAgentsRequestData;
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
    options.raRequestData,
    options.strictOpenAiCompliance,
    options.areSyncHooksAvailable,
  );

  const mappedResponseClone = mappedResponse.clone();
  const mappedResponseCloneText = await mappedResponseClone.text();
  const mappedResponseCloneJson = JSON.parse(mappedResponseCloneText);
  if (options.raRequestData.requestBody instanceof ReadableStream) {
    throw new Error('ReadableStream is not supported');
  } else if (options.raRequestData.requestBody instanceof FormData) {
    throw new Error('FormData is not supported');
  } else if (options.raRequestData.requestBody instanceof ArrayBuffer) {
    throw new Error('ArrayBuffer is not supported');
  }

  const aiProviderLog: AIProviderRequestLog = {
    provider: options.provider,
    function_name: options.raRequestData.functionName,
    method: options.raRequestData.method,
    request_url: options.raRequestData.url,
    status: mappedResponse.status,
    request_body: options.raRequestData.requestBody,
    response_body: mappedResponseCloneJson,
    raw_request_body: JSON.stringify(options.raRequestData.requestBody),
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

export function extractOutputFromResponseBody(
  responseBody: ReactiveAgentsResponseBody,
): string {
  if ('choices' in responseBody) {
    if ('message' in responseBody.choices[0]) {
      const content = responseBody.choices[0].message.content;
      if (Array.isArray(content)) {
        let contentString = '';
        for (const chunk of content) {
          contentString += chunk.text;
        }
        return contentString;
      } else if (typeof content === 'string') {
        return content;
      } else {
        throw new Error('Unexpected content type');
      }
    } else if ('text' in responseBody.choices[0]) {
      return responseBody.choices[0].text;
    }
  } else if ('output' in responseBody) {
    const outputText = responseBody.output_text;
    if (outputText) {
      return outputText;
    } else {
      const output = responseBody.output;
      let outputString = '';
      for (const step of output) {
        switch (step.type) {
          case 'message': {
            if ('content' in step) {
              if (step.content) {
                for (const chunk of step.content) {
                  outputString += chunk.text;
                }
                outputString += '\n';
              }
            } else {
              continue;
            }
            break;
          }
          case 'function':
            outputString += `${step.name}: ${JSON.stringify(step.arguments)}\n`;
            break;
          case 'mcp_call':
            outputString += `${step.name}: ${JSON.stringify(step.arguments)}\n OUTPUT: ${JSON.stringify(step.output)}\n\n`;
            break;
          default:
            continue;
        }
      }
      return outputString;
    }
  }

  throw new Error('Unexpected output type');
}
