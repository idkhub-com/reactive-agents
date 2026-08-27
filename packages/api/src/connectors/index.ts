import { getLibsqlUrl } from '@api/constants';
import type {
  CacheStorageConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { info } from '@shared/console-logging';
import {
  getLibsqlClient,
  libsqlCacheStorageConnector,
  libsqlLogsStorageConnector,
  libsqlUserDataStorageConnector,
  migrateLibsql,
} from './libsql';
import {
  supabaseCacheStorageConnector,
  supabaseLogsStorageConnector,
  supabaseUserDataStorageConnector,
} from './supabase';

/**
 * Storage backend selection.
 *
 * Setting `LIBSQL_URL` chooses libSQL; leaving it unset keeps Supabase, which
 * is what every existing deployment does. One variable covers both shapes
 * because the URL scheme carries the rest of the decision: `file:` is an
 * embedded database for the single-container deployment, `libsql://` or
 * `https://` is a remote one for Workers or any multi-instance deployment.
 *
 * The choice is made per request rather than at module load because on
 * Cloudflare Workers there is no environment until a request arrives — `c.env`
 * is populated from the request context, and `server.ts` merges `process.env`
 * into it so Node resolves the same way.
 */
export const usesLibsql = (c: AppContext): boolean => Boolean(getLibsqlUrl(c));

export const resolveUserDataConnector = (
  c: AppContext,
): UserDataStorageConnector =>
  usesLibsql(c)
    ? libsqlUserDataStorageConnector
    : supabaseUserDataStorageConnector;

export const resolveLogsConnector = (c: AppContext): LogsStorageConnector =>
  usesLibsql(c) ? libsqlLogsStorageConnector : supabaseLogsStorageConnector;

export const resolveCacheConnector = (c: AppContext): CacheStorageConnector =>
  usesLibsql(c) ? libsqlCacheStorageConnector : supabaseCacheStorageConnector;

/**
 * Migration state for the life of the process (or the Worker isolate).
 *
 * The promise is cached rather than a boolean so that requests arriving while
 * the first migration is still running wait for it instead of starting their
 * own. A failure clears the cache so the next request retries rather than
 * inheriting a rejected promise forever.
 *
 * Postgres is migrated by the `migrations` service in docker-compose, so this
 * only ever applies to libSQL.
 */
let migration: Promise<void> | null = null;

export const ensureStorageReady = async (c: AppContext): Promise<void> => {
  if (!usesLibsql(c)) {
    return;
  }

  if (!migration) {
    migration = migrateLibsql(getLibsqlClient(c))
      .then((applied) => {
        if (applied.length > 0) {
          info(`[libsql] applied ${applied.length} migration(s)`);
        }
      })
      .catch((e: unknown) => {
        migration = null;
        throw e;
      });
  }

  await migration;
};

/** Test helper: forget that migrations have run. */
export const resetStorageReady = (): void => {
  migration = null;
};
