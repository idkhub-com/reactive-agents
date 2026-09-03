/**
 * TEMPORARY -- delete once every local database has been moved over.
 *
 * Moves a libSQL dev database from the system_settings shape with a timeout
 * column beside every model (and a `developer_mode` column) to the shape with
 * one `options` JSON column, keeping the values that were set. The initial
 * migration is edited in place while the app has no deployments, so a
 * database created before the edit fails its fingerprint check on the next
 * request; this re-stamps the fingerprint after reshaping the table, which
 * is what lets a large dev database survive the edit instead of being
 * recreated.
 *
 * A copy of the database is taken first, beside it, and the script refuses
 * to run if that copy already exists.
 *
 * Usage, from the repository root:
 *
 *   pnpm --filter @super-agents/api exec tsx scripts/migrate-dev-db-settings-options.ts [path/to/dev.db]
 *
 * The path defaults to `.local-data/dev.db`. Stop `pnpm dev` first: the
 * running server still expects the old columns.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fingerprintOf, migrateLibsql } from '@api/connectors/libsql/migrate';
import { libsqlMigrations } from '@api/connectors/libsql/schema';
import { createClient } from '@libsql/client';
import { SystemSettingsOptions } from '@shared/types/data/system-settings';

const MOVED_COLUMNS = [
  'system_prompt_reflection_timeout_ms',
  'evaluation_generation_timeout_ms',
  'embedding_timeout_ms',
  'judge_timeout_ms',
  'skill_arbiter_timeout_ms',
  'intent_compaction_timeout_ms',
  'developer_mode',
];

async function main(): Promise<void> {
  const path = resolve(process.argv[2] ?? '../../.local-data/dev.db');
  if (!existsSync(path)) {
    throw new Error(`No database at ${path}`);
  }

  const client = createClient({ url: `file:${path}` });
  const columns = (
    await client.execute('PRAGMA table_info(system_settings)')
  ).rows.map((row) => String(row.name));

  const initial = libsqlMigrations.find(
    (migration) => migration.version === '0001_initial_schema',
  );
  if (!initial) {
    throw new Error('The initial migration is missing from schema.ts');
  }
  const fingerprint = await fingerprintOf(initial);

  if (columns.includes('options')) {
    console.log(`${path}: options column already present; verifying only.`);
    await migrateLibsql(client);
    console.log('OK: the database matches the migrations in the code.');
    return;
  }
  const missing = MOVED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new Error(
      `Unexpected system_settings shape: missing ${missing.join(', ')}`,
    );
  }

  const backup = `${path}.bak-before-settings-options`;
  if (existsSync(backup)) {
    throw new Error(`Refusing to overwrite the existing backup at ${backup}`);
  }
  copyFileSync(path, backup);
  console.log(`Backed up to ${backup}`);

  // One transaction: the table is reshaped and the fingerprint re-stamped
  // together, or neither happens.
  await client.batch(
    [
      `ALTER TABLE system_settings ADD COLUMN options TEXT NOT NULL DEFAULT '{}'`,
      `UPDATE system_settings SET options = json_object(
         'system_prompt_reflection', json_object('timeout_ms', system_prompt_reflection_timeout_ms),
         'evaluation_generation', json_object('timeout_ms', evaluation_generation_timeout_ms),
         'embedding', json_object('timeout_ms', embedding_timeout_ms),
         'judge', json_object('timeout_ms', judge_timeout_ms),
         'skill_arbiter', json_object('timeout_ms', skill_arbiter_timeout_ms),
         'intent_compaction', json_object('timeout_ms', intent_compaction_timeout_ms),
         'developer_mode', json(CASE developer_mode WHEN 1 THEN 'true' ELSE 'false' END)
       )`,
      ...MOVED_COLUMNS.map(
        (column) => `ALTER TABLE system_settings DROP COLUMN ${column}`,
      ),
      {
        sql: `UPDATE schema_migrations SET fingerprint = ? WHERE version = '0001_initial_schema'`,
        args: [fingerprint],
      },
    ],
    'write',
  );

  // The app's own check: it throws if the recorded fingerprints do not match
  // the migrations in the code, so passing here means the next request will
  // not refuse the database.
  await migrateLibsql(client);

  const row = (await client.execute('SELECT options FROM system_settings'))
    .rows[0];
  const options = SystemSettingsOptions.parse(JSON.parse(String(row.options)));
  console.log('Migrated. system_settings.options now reads as:');
  console.log(JSON.stringify(options, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
