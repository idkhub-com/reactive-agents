import { CACHE_TTL_SECONDS } from '@api/constants';
import type { CacheStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { getLibsqlClient } from './client';
import { nowIso } from './rows';

/**
 * Cache backed by libSQL.
 *
 * `CacheStorageConnector.setCache` takes no TTL parameter, so each backend has
 * to pick one. Both use `CACHE_TTL_SECONDS`, which is what keeps a cached
 * response live for the same length of time whichever storage is configured.
 */
export const libsqlCacheStorageConnector: CacheStorageConnector = {
  getCache: async (c: AppContext, key: string): Promise<string | null> => {
    const client = getLibsqlClient(c);

    const result = await client.execute({
      sql: 'SELECT value FROM cache WHERE key = ? AND expires_at >= ? LIMIT 1',
      args: [key, nowIso()],
    });

    const row = result.rows[0];
    return row ? String(row.value) : null;
  },

  setCache: async (
    c: AppContext,
    key: string,
    value: string,
  ): Promise<void> => {
    const client = getLibsqlClient(c);
    const expiresAt = new Date(
      Date.now() + CACHE_TTL_SECONDS * 1000,
    ).toISOString();

    await client.execute({
      sql: `INSERT INTO cache (key, value, expires_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
      args: [key, value, expiresAt],
    });
  },

  deleteCache: async (c: AppContext, key: string): Promise<void> => {
    const client = getLibsqlClient(c);
    await client.execute({
      sql: 'DELETE FROM cache WHERE key = ?',
      args: [key],
    });
  },
};
