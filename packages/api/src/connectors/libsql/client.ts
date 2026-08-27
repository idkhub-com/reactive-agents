import { getLibsqlAuthToken, getLibsqlUrl } from '@api/constants';
import type { AppContext } from '@api/types/hono';
import { type Client, createClient } from '@libsql/client';

/**
 * `@libsql/client` declares a `workerd` export condition that resolves to its
 * HTTP-only build, so this plain specifier is safe on both runtimes: Node gets
 * the full client (local files included) and Workers gets the remote-only one.
 * Importing `@libsql/client/node` explicitly would break the Worker bundle.
 */

/**
 * One client per URL for the lifetime of the process.
 *
 * A libSQL client owns a connection pool, so building one per request would
 * leak file handles against a local database and sockets against a remote one.
 * Keyed by URL so tests can hold several independent databases at once.
 */
const clients = new Map<string, Client>();

/** Applied once per client; SQLite leaves foreign keys unenforced otherwise. */
const initialised = new WeakSet<Client>();

const isFileUrl = (url: string): boolean =>
  url.startsWith('file:') || url.startsWith(':memory:');

/**
 * Build a client for an explicit URL. Prefer `getLibsqlClient` in request
 * handling code; this exists for the migration runner and for tests.
 */
export const createLibsqlClient = (url: string, authToken?: string): Client => {
  const existing = clients.get(url);
  if (existing) {
    return existing;
  }

  // A remote database rejects an empty auth token, and a local file rejects a
  // token it has no use for, so only pass one when it is actually set.
  const client = createClient(
    authToken && !isFileUrl(url) ? { url, authToken } : { url },
  );

  clients.set(url, client);
  return client;
};

/**
 * The client for this deployment's configured database.
 *
 * Throws when `LIBSQL_URL` is unset rather than falling back to a default path,
 * so that a misconfigured deployment fails at the first query instead of
 * quietly writing to a file nobody will think to look in.
 */
export const getLibsqlClient = (c: AppContext): Client => {
  const url = getLibsqlUrl(c);
  if (!url) {
    throw new Error(
      'LIBSQL_URL is not set. Set it to a file path (file:/app/data/super-agents.db) or a remote libSQL URL (libsql://...).',
    );
  }

  return createLibsqlClient(url, getLibsqlAuthToken(c));
};

/**
 * Turn on foreign key enforcement, which SQLite leaves off per connection.
 * Without this the schema's ON DELETE CASCADE rules never fire and the libSQL
 * backend would silently keep rows Postgres would have removed.
 */
export const ensureForeignKeys = async (client: Client): Promise<void> => {
  if (initialised.has(client)) {
    return;
  }
  await client.execute('PRAGMA foreign_keys = ON');
  initialised.add(client);
};

/** Test helper: drop cached clients so each case starts from a clean slate. */
export const resetLibsqlClients = (): void => {
  clients.clear();
};
