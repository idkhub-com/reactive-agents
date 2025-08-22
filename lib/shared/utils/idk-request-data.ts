import type { HttpMethod } from '@server/types/http';
import { functionConfigs } from '@shared/types/api/request';
import {
  type IdkRequestBody,
  IdkRequestData,
} from '@shared/types/api/request/body';
import type { IdkResponseBody } from '@shared/types/api/response';

export function produceIdkRequestData(
  method: HttpMethod,
  urlString: string,
  requestHeaders: Record<string, string>,
  rawRequestBody: Record<string, unknown>,
  rawResponseBody?: Record<string, unknown>,
): IdkRequestData {
  const url = new URL(urlString);
  const pathname = url.pathname;

  if (!pathname) {
    throw new Error('No pathname found in URL');
  }

  let stream = false;
  if ('stream' in rawRequestBody && rawRequestBody.stream === true) {
    stream = true;
  }

  // Find matching route pattern
  for (const config of functionConfigs) {
    if (
      config.route_pattern.test(pathname) &&
      config.method === method &&
      (config.stream ?? false) === stream
    ) {
      const functionName = config.functionName;

      let requestBody = rawRequestBody;
      const requestSchemaSafeParseResult =
        config.requestSchema.safeParse(rawRequestBody);
      if (!requestSchemaSafeParseResult.success) {
        throw new Error(
          `Invalid request body: ${requestSchemaSafeParseResult.error}`,
        );
      }
      requestBody = requestSchemaSafeParseResult.data as IdkRequestBody;

      let responseBody: IdkResponseBody | undefined;
      if (rawResponseBody) {
        const responseSchemaSafeParseResult =
          config.responseSchema.safeParse(rawResponseBody);
        if (!responseSchemaSafeParseResult.success) {
          throw new Error(
            `Invalid response body: ${responseSchemaSafeParseResult.error}`,
          );
        }
        responseBody = responseSchemaSafeParseResult.data as IdkResponseBody;
      }

      const rawIdkRequestData = {
        route_pattern: config.route_pattern,
        method: config.method,
        url: urlString,
        functionName,
        requestHeaders,
        requestBody,
        responseBody,
        requestSchema: config.requestSchema,
        responseSchema: config.responseSchema,
      };

      const idkRequestData = IdkRequestData.parse(rawIdkRequestData);

      return idkRequestData;
    }
  }

  throw new Error(`Unknown method: ${method} for pathname: ${pathname}`);
}
