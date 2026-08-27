import type { Client } from '@libsql/client';
import { info } from '@shared/console-logging';
import { ensureForeignKeys } from './client';
import { type LibsqlMigration, libsqlMigrations } from './schema';

/**
 * Mirrors the Postgres tracking table that
 * `docker/postgres/migrations/run-migrations.sh` maintains, so both backends
 * answer "which migrations have been applied" the same way.
 */
const SCHEMA_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

const appliedVersions = async (client: Client): Promise<Set<string>> => {
  const result = await client.execute('SELECT version FROM schema_migrations');
  return new Set(result.rows.map((row) => String(row.version)));
};

/**
 * Apply any migrations this database has not seen.
 *
 * Each migration goes through `batch(..., 'write')`, which wraps its statements
 * in a single transaction: a migration either lands completely or not at all,
 * and its `schema_migrations` row is written inside the same transaction so the
 * two can never disagree.
 *
 * Unlike the Postgres runner there is no advisory lock. A local database has a
 * single writer by definition, and for a remote one the `CREATE TABLE IF NOT
 * EXISTS` / `INSERT OR IGNORE` shape means a concurrent second runner converges
 * on the same result rather than corrupting anything.
 */
export const migrateLibsql = async (
  client: Client,
  migrations: LibsqlMigration[] = libsqlMigrations,
): Promise<string[]> => {
  await ensureForeignKeys(client);
  await client.execute(SCHEMA_MIGRATIONS);

  const applied = await appliedVersions(client);
  const ran: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    await client.batch(
      [
        ...migration.statements,
        {
          sql: 'INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)',
          args: [migration.version],
        },
      ],
      'write',
    );

    ran.push(migration.version);
    info(`[libsql] applied migration ${migration.version}`);
  }

  return ran;
};
