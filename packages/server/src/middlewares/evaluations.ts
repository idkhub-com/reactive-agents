import type { EvaluationMethodConnector } from '@server/types/connector';
import type { AppEnv } from '@server/types/hono';
import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

/**
 * Middleware to handle evaluation connectors.
 */
export const evaluationMethodConnectors = (
  factory: Factory<AppEnv>,
  connectors: EvaluationMethodConnector[],
): MiddlewareHandler<AppEnv> =>
  factory.createMiddleware(async (c, next) => {
    // Create connectors map directly from provided connectors
    const connectorsMap: Record<string, EvaluationMethodConnector> = {};

    for (const connector of connectors) {
      const details = connector.getDetails();
      connectorsMap[details.method] = connector;
    }

    // Set the connectors map on context
    c.set('evaluation_connectors_map', connectorsMap);

    await next();
  });
