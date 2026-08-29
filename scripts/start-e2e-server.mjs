#!/usr/bin/env node
/**
 * Boots the built application for the end-to-end suite.
 *
 * This starts the same single Node process the published image runs -- one Hono
 * app serving `/v1` and the dashboard's static build -- rather than the split
 * Vite/API pair behind `pnpm dev`. That split is also why a dev-server suite
 * would not work here: under `pnpm dev` it is Vite that answers everything
 * outside `/v1`, so the static serving, the SPA fallback and the `/v1` 404
 * boundary these tests cover never execute at all.
 *
 * Storage defaults to a throwaway libSQL file, which is what keeps the suite
 * hermetic: no Postgres, no PostgREST, nothing to orchestrate. Migrations run
 * on the first request that touches storage, so deleting the file is a full
 * reset.
 *
 * Setting E2E_POSTGREST_URL switches this instance to the Supabase backend
 * instead, so the same contract specs can be run against both connectors and
 * catch divergence between them. That backend is migrated by the `migrations`
 * compose service rather than on first request, so it has to be up already --
 * `scripts/e2e-postgres.sh up` does that.
 *
 * Configured through the environment so one script can back several Playwright
 * `webServer` entries:
 *
 *   E2E_PORT            port to listen on (default 3100)
 *   E2E_ACCESS_PASSWORD when set, the dashboard requires a login
 *   E2E_DB_NAME         libSQL database filename, so servers don't share state
 *   E2E_POSTGREST_URL   use Supabase/PostgREST instead of libSQL
 *   E2E_POSTGREST_KEY   service role key for that PostgREST instance
 */
import { createHmac } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const apiBundle = join(repoRoot, 'packages/api/dist/server.js');
const dashboardBuild = join(repoRoot, 'packages/web/dist');

for (const [path, what] of [
  [apiBundle, 'API bundle'],
  [dashboardBuild, 'dashboard build'],
]) {
  if (!existsSync(path)) {
    console.error(
      `The ${what} is missing (${path}).\n` +
        'The end-to-end suite runs against the built app -- run `pnpm build` ' +
        'first, or use `pnpm test:e2e`, which builds for you.',
    );
    process.exit(1);
  }
}

const base64url = (value) => Buffer.from(value).toString('base64url');

/**
 * Sign a short-lived `service_role` token for the local PostgREST.
 *
 * The secret is read from docker-compose.yml rather than duplicated, because
 * that file is what actually starts PostgREST -- a second copy here would be a
 * second thing to keep in step, and a literal token in the repository trips
 * secret scanning for no benefit.
 */
function mintServiceRoleToken() {
  const compose = readFileSync(join(repoRoot, 'docker-compose.yml'), 'utf8');
  const secret =
    process.env.PGRST_JWT_SECRET ??
    compose.match(/PGRST_JWT_SECRET:\s*\$\{PGRST_JWT_SECRET:-([^}]+)\}/)?.[1];

  if (!secret) {
    throw new Error(
      'Could not determine the PostgREST JWT secret. Set PGRST_JWT_SECRET, or ' +
        'pass a ready-made token as E2E_POSTGREST_KEY.',
    );
  }

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      role: 'service_role',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  );
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

const postgrestUrl = process.env.E2E_POSTGREST_URL;

if (postgrestUrl) {
  // Supabase backend. Nothing to reset here: the schema is owned by the
  // `migrations` compose service, and the contract specs clean up the rows
  // they create, which is also what makes them safe to run against a database
  // that is not empty.
  process.env.POSTGREST_URL = postgrestUrl;
  /**
   * PostgREST authenticates with a JWT whose `role` claim selects the database
   * role. There is no dev fallback for this one: `getPostgrestServiceRoleKey`
   * throws under NODE_ENV=production, which is what the server runs as here.
   *
   * Minted here rather than committed as a literal, so the repository carries
   * no token-shaped string and the signing secret has exactly one source of
   * truth -- the same compose default PostgREST itself is started with. Change
   * PGRST_JWT_SECRET in the environment and both sides follow.
   */
  process.env.POSTGREST_SERVICE_ROLE_KEY =
    process.env.E2E_POSTGREST_KEY ?? mintServiceRoleToken();
  // Deleted rather than blanked: `resolveUserDataConnector` treats any
  // non-empty LIBSQL_URL as "use libSQL", and assigning undefined to
  // process.env stores the string "undefined", which is non-empty.
  delete process.env.LIBSQL_URL;
} else {
  // A fresh database per boot. Kept in the repo rather than the system temp
  // directory so that a failed run leaves it behind to inspect.
  const dataDir = join(repoRoot, '.e2e-data');
  mkdirSync(dataDir, { recursive: true });
  const dbFile = join(dataDir, process.env.E2E_DB_NAME ?? 'e2e.db');
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${dbFile}${suffix}`, { force: true });
  }
  process.env.LIBSQL_URL = `file:${dbFile}`;
}

process.env.PORT = process.env.E2E_PORT ?? '3100';
process.env.NODE_ENV = 'production';

// `serveStatic` resolves its root against the working directory, so the path
// has to be relative and the process has to start from the repo root.
process.chdir(repoRoot);
process.env.DASHBOARD_ROOT = './packages/web/dist';

// Production refuses to start without these two. The values are throwaway, but
// they have to be present or the first request that reads one throws.
process.env.AUTH_JWT_SECRET ??= 'e2e-jwt-secret-not-used-outside-tests';
process.env.AI_PROVIDER_API_KEY_ENCRYPTION_KEY ??=
  'e2e-32-byte-key-for-tests-only!!';

if (process.env.E2E_ACCESS_PASSWORD) {
  process.env.ACCESS_PASSWORD = process.env.E2E_ACCESS_PASSWORD;
}

// Imported rather than spawned: the bundle starts listening as a side effect of
// module evaluation, so staying in-process means Playwright's shutdown signal
// reaches the server directly instead of having to be forwarded to a child.
await import(apiBundle);
