import { bedrockErrorResponseTransform } from '@server/ai-providers/bedrock/chat-complete';
import { getOctetStreamToOctetStreamTransformer } from '@server/handlers/stream-handler-utils';
import type { AppContext } from '@server/types/hono';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { IdkRequestData } from '@shared/types/api/request';
import type { IdkTarget } from '@shared/types/api/request/headers';
import type { FileContentResponseBody } from '@shared/types/api/routes/files-api';
import { AIProvider } from '@shared/types/constants';
import bedrockAPIConfig from './api';

const getRowTransform = (): ((
  row: Record<string, unknown>,
) => Record<string, unknown>) => {
  return (row: Record<string, unknown>): Record<string, unknown> => row;
};

export const bedrockRetrieveFileContentRequestHandler = async ({
  c,
  idkTarget,
  idkRequestData,
}: {
  c: AppContext;
  idkTarget: IdkTarget;
  idkRequestData: IdkRequestData;
}): Promise<Response> => {
  try {
    // construct the base url and endpoint
    const baseURL = bedrockAPIConfig.getBaseURL({
      c,
      idkTarget,
      idkRequestData,
    });
    const endpoint = bedrockAPIConfig.getEndpoint({
      c,
      idkTarget,
      idkRequestData,
    });
    const url = `${baseURL}${endpoint}`;

    // generate the headers
    const headers = await bedrockAPIConfig.headers({
      c,
      idkTarget,
      idkRequestData,
    });

    // make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: headers as HeadersInit,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        JSON.stringify({
          type: 'provider_error',
          code: response.status,
          param: null,
          message: `bedrock error: ${errorText}`,
        }),
      );
    }

    // transform the streaming response to provider format
    let responseStream: ReadableStream;
    if (response?.body) {
      responseStream = response?.body?.pipeThrough(
        getOctetStreamToOctetStreamTransformer(getRowTransform()),
      );
    } else {
      throw new Error(
        'Failed to parse and transform file content, please verify that the file is a valid jsonl file used for batching or fine-tuning',
      );
    }

    // return the response
    return new Response(responseStream, {
      headers: {
        'content-type': 'application/octet-stream',
      },
    });
  } catch (error: unknown) {
    let errorResponse: Record<string, unknown> & { provider?: string };

    try {
      errorResponse = JSON.parse((error as Error).message);
      errorResponse.provider = AIProvider.BEDROCK;
    } catch (_e) {
      errorResponse = {
        error: {
          message: (error as Error).message,
          type: null,
          param: null,
          code: 500,
        },
        provider: AIProvider.BEDROCK,
      };
    }
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const bedrockRetrieveFileContentResponseTransform: ResponseTransformFunction =
  (response, responseStatus) => {
    if (responseStatus !== 200) {
      const error = bedrockErrorResponseTransform(response);
      if (error) {
        return error;
      }
    }

    return response as unknown as FileContentResponseBody;
  };
