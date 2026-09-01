import type { Client } from '@libsql/client';
import { info } from '@shared/console-logging';
import { ensureForeignKeys } from './client';
import { type LibsqlMigration, libsqlMigrations } from './schema';

/**
 * Mirrors the Postgres tracking table that
 * `docker/postgres/migrations/run-migrations.sh` maintains, so both backends
 * answer "which migrations have been applied" the same way. `fingerprint` is
 * this side's addition: see `StaleMigrationError`.
 */
const SCHEMA_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  fingerprint TEXT
)`;

/**
 * A database whose applied migration is not the migration in the code.
 *
 * Migrations are edited in place while the app has no deployments (see
 * AGENTS.md), so a database migrated last week may be missing columns the
 * code now reads -- and the first sign of that would otherwise be a row
 * failing to parse, deep in some request. Each applied migration is recorded
 * with a fingerprint of its statements, and a mismatch is refused here, where
 * the remedy can be spelled out.
 */
export class StaleMigrationError extends Error {
  constructor(
    public readonly version: string,
    recorded: string | null,
  ) {
    super(
      `libSQL migration ${version} does not match this database: ${
        recorded
          ? 'it has changed since the database was migrated'
          : 'the database was migrated before migrations were fingerprinted'
      }. Migrations are edited in place while the app has no deployments, so start from a fresh database: delete it (\`.local-data/dev.db\` under \`pnpm dev\`) and the next request will recreate it.`,
    );
    this.name = 'StaleMigrationError';
  }
}

/** SHA-256 of the statements, hex. Web Crypto, so it runs on Workers too. */
export const fingerprintOf = async (
  migration: LibsqlMigration,
): Promise<string> => {
  const bytes = new TextEncoder().encode(migration.statements.join('\n;\n'));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
};

/** Databases from before fingerprints get the column; their rows stay NULL. */
const ensureFingerprintColumn = async (client: Client): Promise<void> => {
  const columns = await client.execute('PRAGMA table_info(schema_migrations)');
  if (!columns.rows.some((row) => row.name === 'fingerprint')) {
    await client.execute(
      'ALTER TABLE schema_migrations ADD COLUMN fingerprint TEXT',
    );
  }
};

const appliedMigrations = async (
  client: Client,
): Promise<Map<string, string | null>> => {
  const result = await client.execute(
    'SELECT version, fingerprint FROM schema_migrations',
  );
  return new Map(
    result.rows.map((row) => [
      String(row.version),
      row.fingerprint == null ? null : String(row.fingerprint),
    ]),
  );
};

/**
 * Apply any migrations this database has not seen, and refuse a database
 * whose applied migrations are not the ones in the code.
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
  await ensureFingerprintColumn(client);

  const applied = await appliedMigrations(client);
  const ran: string[] = [];

  for (const migration of migrations) {
    const fingerprint = await fingerprintOf(migration);

    if (applied.has(migration.version)) {
      const recorded = applied.get(migration.version) ?? null;
      if (recorded !== fingerprint) {
        throw new StaleMigrationError(migration.version, recorded);
      }
      continue;
    }

    await client.batch(
      [
        ...migration.statements,
        {
          sql: 'INSERT OR IGNORE INTO schema_migrations (version, fingerprint) VALUES (?, ?)',
          args: [migration.version, fingerprint],
        },
      ],
      'write',
    );

    ran.push(migration.version);
    info(`[libsql] applied migration ${migration.version}`);
  }

  return ran;
};
