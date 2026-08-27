import { RouterError } from '@api/errors/router';

import type { AppContext } from '@api/types/hono';

import { HeaderKey } from '@shared/types/api/request/headers';
import { tryTargets } from './handler-utils';

// async function getRequestData(
//   request: Request,
//   contentType: string,
// ): Promise<SuperAgentsRequestBody | FormData | ArrayBuffer | ReadableStream> {
//   let finalRequest: SuperAgentsRequestBody | FormData | ArrayBuffer | ReadableStream;
//   if (contentType == ContentTypeName.APPLICATION_JSON) {
//     if (['GET', 'DELETE'].includes(request.method)) {
//       finalRequest = {
//         model: '',
//         messages: [],
//       };
//     } else {
//       finalRequest = await request.json();
//     }
//   } else if (contentType == ContentTypeName.MULTIPART_FORM_DATA) {
//     finalRequest = await request.formData();
//   } else if (contentType?.startsWith(ContentTypeName.GENERIC_AUDIO_PATTERN)) {
//     finalRequest = await request.arrayBuffer();
//   } else {
//     throw new Error(`Unsupported content type: ${contentType}`);
//   }

//   return finalRequest;
// }

export async function proxyHandler(c: AppContext): Promise<Response> {
  try {
    const requestContentType = c.req
      .header(HeaderKey.CONTENT_TYPE)
      ?.split(';')[0];

    if (!requestContentType) {
      throw new Error('Content-Type header is required');
    }

    // const request = await getRequestData(c.req.raw, requestContentType); // TODO: Fix this

    const saConfig = c.get('sa_config');
    const saRequestData = c.get('sa_request_data');

    const tryTargetsResponse = await tryTargets(c, saConfig, saRequestData);

    return tryTargetsResponse;
  } catch (err: unknown) {
    let statusCode = 500;
    let errorMessage = `Proxy error`;

    if (err instanceof Error) {
      console.error('proxy error', err.message);
      errorMessage = `Proxy error: ${err.message}`;
    } else {
      console.error('proxy error', err);
    }

    if (err instanceof RouterError) {
      statusCode = 400;
      errorMessage = err.message;
    }

    return new Response(
      JSON.stringify({
        status: 'failure',
        message: errorMessage,
      }),
      {
        status: statusCode,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }
}
