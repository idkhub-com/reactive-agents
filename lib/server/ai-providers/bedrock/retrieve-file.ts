import type { AppContext } from '@server/types/hono';
import type { IdkRequestData } from '@shared/types/api/request';
import type { IdkTarget } from '@shared/types/api/request/headers';
import { AIProvider } from '@shared/types/constants';
import bedrockAPIConfig from './api';

export const bedrockRetrieveFileRequestHandler = async ({
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
    const baseUrl = await bedrockAPIConfig.getBaseURL({
      c,
      idkTarget,
      idkRequestData,
    });
    const endpoint = bedrockAPIConfig.getEndpoint({
      c,
      idkTarget,
      idkRequestData,
    });
    const retrieveFileURL = `${baseUrl}${endpoint}`;

    // generate the headers
    const headers = await bedrockAPIConfig.headers({
      c,
      idkTarget,
      idkRequestData,
    });

    // make the request
    const response = await fetch(retrieveFileURL, {
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

    // parse necessary information from xml response
    const responseBodyXML = await response.text();
    const responseHeaders = response.headers;
    const match = responseBodyXML.match(/<ObjectSize>(\d+)<\/ObjectSize>/);
    const size = match?.[1];

    // transform the response
    const transformedResponse = {
      object: 'file',
      id: idkRequestData.url.split('/v1/files/')[1],
      purpose: '',
      filename: decodeURIComponent(idkRequestData.url.split('/v1/files/')[1]),
      bytes: size,
      createdAt: Math.floor(
        new Date(responseHeaders.get('last-modified') || '').getTime() / 1000,
      ),
      status: 'processed',
      status_details: null,
    };

    // return the response
    return new Response(JSON.stringify(transformedResponse), {
      headers: {
        'content-type': 'application/json',
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
