import { ensureStorageReady } from '@api/connectors';
import { StaleMigrationError } from '@api/connectors/libsql/migrate';
import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext, AppEnv } from '@api/types/hono';
import { error } from '@shared/console-logging';
import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

/**
 * Middleware that sets up a connection with the UserDataStorageConnector
 * This middleware makes the UserDataStorageConnector available in the context
 * for use in routes that need to access user data (feedback, etc.)
 *
 * Takes a resolver rather than a connector because the backend is chosen from
 * the environment, and on Workers there is no environment until a request
 * arrives. This is also the first middleware to touch storage, so it is where
 * libSQL gets migrated.
 */
export const userDataMiddleware = (
  factory: Factory<AppEnv>,
  resolve: (c: AppContext) => UserDataStorageConnector,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    try {
      await ensureStorageReady(c);
    } catch (e) {
      // Written for whoever runs the server, so it goes out as the answer:
      // a 503 the dashboard shows, rather than a 500 it mistakes for being
      // logged out.
      if (e instanceof StaleMigrationError) {
        error(`[libsql] ${e.message}`);
        return c.json({ error: e.message }, 503);
      }
      throw e;
    }

    // Set the connector in the context for use in routes
    c.set('user_data_storage_connector', resolve(c));

    await next();
  });
