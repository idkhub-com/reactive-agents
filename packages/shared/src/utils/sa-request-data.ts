import { functionConfigs } from '@shared/types/api/request';
import {
  type SuperAgentsRequestBody,
  SuperAgentsRequestData,
} from '@shared/types/api/request/body';
import type { SuperAgentsResponseBody } from '@shared/types/api/response';
import type { HttpMethod } from '@shared/types/http';
import { parseAgentSkillPath } from '@shared/utils/url';

/**
 * Thrown when no known API route matches the request's method, path and stream
 * mode. Callers should surface this as a 404 rather than a server error.
 */
export class UnknownRouteError extends Error {
  constructor(method: HttpMethod, pathname: string) {
    super(`Unknown method: ${method} for pathname: ${pathname}`);
    this.name = 'UnknownRouteError';
  }
}

/**
 * Thrown when the request body does not match the schema of the matched route.
 * Callers should surface this as a 422 rather than a server error.
 */
export class InvalidRequestBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRequestBodyError';
  }
}

/**
 * Requests may name the agent and skill in the path
 * (`/v1/agents/:agent_name/skills/:skill_name/chat/completions`). Route matching
 * happens on the canonical path so both request styles resolve to the same
 * function.
 */
function canonicalizeUrl(urlString: string): {
  pathname: string;
  url: string;
} {
  const url = new URL(urlString);
  const agentSkillScope = parseAgentSkillPath(url.pathname);

  if (!agentSkillScope) {
    return { pathname: url.pathname, url: urlString };
  }

  url.pathname = agentSkillScope.pathname;
  return { pathname: url.pathname, url: url.toString() };
}

/**
 * Whether any known API route serves this method and path.
 *
 * This ignores the request body, so it can be checked before the body is read.
 * A route that matches here can still be rejected by
 * `produceSuperAgentsRequestData` when the body does not fit its schema.
 */
export function isKnownRoute(method: HttpMethod, urlString: string): boolean {
  const { pathname } = canonicalizeUrl(urlString);

  return functionConfigs.some(
    (config) => config.method === method && config.route_pattern.test(pathname),
  );
}

export function produceSuperAgentsRequestData(
  method: HttpMethod,
  urlString: string,
  requestHeaders: Record<string, string>,
  rawRequestBody: Record<string, unknown>,
  rawResponseBody?: Record<string, unknown> | null,
): SuperAgentsRequestData {
  const { pathname, url: canonicalUrl } = canonicalizeUrl(urlString);

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
        throw new InvalidRequestBodyError(
          `Invalid request body: ${requestSchemaSafeParseResult.error}`,
        );
      }
      requestBody = requestSchemaSafeParseResult.data as SuperAgentsRequestBody;

      let responseBody: SuperAgentsResponseBody | undefined;
      let unvalidatedResponseBody: SuperAgentsResponseBody | undefined;
      if (rawResponseBody) {
        const responseSchemaSafeParseResult =
          config.responseSchema.safeParse(rawResponseBody);
        if (!responseSchemaSafeParseResult.success) {
          // For logs, the response may have been modified during accumulation
          // Use the raw response without validation instead of throwing.
          // It is kept out of the parse below, which validates `responseBody`
          // against the same schema and would reject the very bodies this
          // branch exists to tolerate.
          console.warn(
            `Response body validation failed for ${functionName}, using raw response:`,
            responseSchemaSafeParseResult.error,
          );
          unvalidatedResponseBody = rawResponseBody as SuperAgentsResponseBody;
        } else {
          responseBody =
            responseSchemaSafeParseResult.data as SuperAgentsResponseBody;
        }
      }

      const rawSuperAgentsRequestData = {
        route_pattern: config.route_pattern,
        method: config.method,
        url: canonicalUrl,
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

      if (unvalidatedResponseBody) {
        return {
          ...saRequestData,
          responseBody: unvalidatedResponseBody,
        } as SuperAgentsRequestData;
      }

      return saRequestData;
    }
  }

  throw new UnknownRouteError(method, pathname);
}
