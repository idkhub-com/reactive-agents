import { functionConfigs } from '@shared/types/api/request';
import {
  type SuperAgentsRequestBody,
  SuperAgentsRequestData,
} from '@shared/types/api/request/body';
import type { SuperAgentsResponseBody } from '@shared/types/api/response';
import type { HttpMethod } from '@shared/types/http';

export function produceSuperAgentsRequestData(
  method: HttpMethod,
  urlString: string,
  requestHeaders: Record<string, string>,
  rawRequestBody: Record<string, unknown>,
  rawResponseBody?: Record<string, unknown> | null,
): SuperAgentsRequestData {
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
    const patternMatches = config.route_pattern.test(pathname);
    const methodMatches = config.method === method;
    const streamMatches = (config.stream ?? false) === stream;

    if (patternMatches && methodMatches && streamMatches) {
      const functionName = config.functionName;

      let requestBody = rawRequestBody;
      const requestSchemaSafeParseResult =
        config.requestSchema.safeParse(rawRequestBody);
      if (!requestSchemaSafeParseResult.success) {
        throw new Error(
          `Invalid request body: ${requestSchemaSafeParseResult.error}`,
        );
      }
      requestBody = requestSchemaSafeParseResult.data as SuperAgentsRequestBody;

      let responseBody: SuperAgentsResponseBody | undefined;
      if (rawResponseBody) {
        const responseSchemaSafeParseResult =
          config.responseSchema.safeParse(rawResponseBody);
        if (!responseSchemaSafeParseResult.success) {
          // For logs, the response may have been modified during accumulation
          // Use the raw response without validation instead of throwing
          console.warn(
            `Response body validation failed for ${functionName}, using raw response:`,
            responseSchemaSafeParseResult.error,
          );
          responseBody = rawResponseBody as SuperAgentsResponseBody;
        } else {
          responseBody =
            responseSchemaSafeParseResult.data as SuperAgentsResponseBody;
        }
      }

      const rawSuperAgentsRequestData = {
        route_pattern: config.route_pattern,
        method: config.method,
        url: urlString,
        functionName,
        requestHeaders,
        requestBody,
        responseBody,
        requestSchema: config.requestSchema,
        responseSchema: config.responseSchema,
        stream: config.stream,
      };

      const saRequestData = SuperAgentsRequestData.parse(
        rawSuperAgentsRequestData,
      );

      return saRequestData;
    }
  }

  throw new Error(`Unknown method: ${method} for pathname: ${pathname}`);
}
