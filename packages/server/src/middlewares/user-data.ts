import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppEnv } from '@server/types/hono';
import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

/**
 * Middleware that sets up a connection with the UserDataStorageConnector
 * This middleware makes the UserDataStorageConnector available in the context
 * for use in routes that need to access user data (feedback, etc.)
 */
export const userDataMiddleware = (
  factory: Factory<AppEnv>,
  connector: UserDataStorageConnector,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    // Set the connector in the context for use in routes
    c.set('user_data_storage_connector', connector);

    await next();
  });
