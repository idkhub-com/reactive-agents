import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * These tests run against the built app booted by `scripts/start-e2e-server.mjs`
 * -- one Node process serving both `/v1` and the dashboard, backed by a real
 * database. That is deliberately the production shape rather than the
 * `pnpm dev` shape: the static-file serving, the SPA fallback and the `/v1` 404
 * boundary only exist in `server.ts`, so a suite pointed at Vite would not
 * cover them.
 *
 * Three servers, because two things are decided per request from the
 * environment and cannot be changed without a restart:
 *
 *  - the storage backend, so the contract specs can run against libSQL and
 *    Supabase and catch divergence between the two connectors;
 *  - dashboard authentication, so the login flow has somewhere to happen.
 */

const LIBSQL_PORT = Number(process.env.E2E_LIBSQL_PORT ?? 3100);
const AUTH_PORT = Number(process.env.E2E_AUTH_PORT ?? 3101);
const SUPABASE_PORT = Number(process.env.E2E_SUPABASE_PORT ?? 3102);
const STUB_PORT = Number(process.env.E2E_STUB_PORT ?? 3103);
const VISUAL_PORT = Number(process.env.E2E_VISUAL_PORT ?? 3104);

/**
 * The visual project is opt-in because a pixel baseline is only meaningful
 * where the rendering environment is pinned. FreeType hinting and antialiasing
 * differ between distributions, and Playwright labels every one of them
 * `linux`, so a baseline written on a workstation and compared on a CI runner
 * would disagree about pixels nobody changed -- while reusing the same file.
 *
 * `pnpm test:e2e:visual` sets this and runs the project inside the Playwright
 * container image, which is also what CI runs it in. Unset, the project is not
 * registered at all, so `pnpm test:e2e` needs no container runtime and cannot
 * fail on a rendering difference.
 */
const visualEnabled = Boolean(process.env.E2E_VISUAL);

/** Only ever reaches the throwaway server started below. */
export const AUTH_PASSWORD = 'e2e-access-password';

/**
 * The Supabase half is opt-in because it needs Postgres and PostgREST running,
 * which `scripts/e2e-postgres.sh up` provides and `pnpm test:e2e:all` wires up.
 * Left unset, the suite still runs in full against libSQL with no container
 * runtime at all -- but it then proves nothing about the backend that every
 * existing deployment actually uses, so say so rather than skipping quietly.
 */
const postgrestUrl = process.env.E2E_POSTGREST_URL;
// Playwright re-evaluates this config in every worker process, which sets
// TEST_WORKER_INDEX; without the guard the notice is printed once per worker.
if (!postgrestUrl && process.env.TEST_WORKER_INDEX === undefined) {
  console.warn(
    '[e2e] E2E_POSTGREST_URL is not set: running against libSQL only. ' +
      'Use `pnpm test:e2e:all` to also check the Supabase connector.',
  );
}

const libsqlBaseURL = `http://127.0.0.1:${LIBSQL_PORT}`;
const authBaseURL = `http://127.0.0.1:${AUTH_PORT}`;
const supabaseBaseURL = `http://127.0.0.1:${SUPABASE_PORT}`;
const visualBaseURL = `http://127.0.0.1:${VISUAL_PORT}`;

const server = (port: number, env: Record<string, string>) => ({
  command: 'node scripts/start-e2e-server.mjs',
  url: `http://127.0.0.1:${port}/health`,
  /**
   * `E2E_POSTGREST_URL` is blanked first so a libSQL server cannot inherit it
   * from the shell that launched the run. Playwright merges this map into the
   * parent environment rather than replacing it, so without the explicit empty
   * value `pnpm test:e2e:all` would quietly point every server at Postgres and
   * the two contract projects would test the same backend twice.
   */
  env: { E2E_POSTGREST_URL: '', E2E_PORT: String(port), ...env },
  // Locally, reuse whatever is already listening so the edit/run loop stays
  // quick. CI always boots its own, so a stale server can never mask a break.
  reuseExistingServer: !process.env.CI,
  timeout: 90_000,
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
});

export default defineConfig({
  testDir: './e2e',
  // Every test coins its own agent names, so files are safe to run together.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: './e2e-results',

  /**
   * Deliberately without Playwright's usual `{platform}` and `{projectName}`
   * suffixes. Those exist to keep baselines from different environments apart,
   * and both of ours would say `linux` regardless of which distribution wrote
   * them -- the suffix would imply a guarantee it cannot make. The container
   * is what pins the environment here, so the path can stay plain.
   */
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      // Freezes CSS animations and Web Animations API playback. It does not
      // reach the framer-motion sidebar logo, which `screenshot.css` hides --
      // see the note there.
      animations: 'disabled',
      stylePath: './e2e/visual/screenshot.css',
    },
  },

  use: {
    baseURL: libsqlBaseURL,
    // Kept only for failures: a trace per test would dwarf the run itself.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      // The server's own shape -- static serving, SPA fallback, the `/v1`
      // boundary, security headers. Backend-agnostic, so it runs once.
      name: 'api',
      testDir: './e2e/api',
      use: { baseURL: libsqlBaseURL },
    },
    {
      // The storage contract. This directory is the one that runs twice.
      name: 'contract:libsql',
      testDir: './e2e/contract',
      use: { baseURL: libsqlBaseURL },
    },
    ...(postgrestUrl
      ? [
          {
            name: 'contract:supabase',
            testDir: './e2e/contract',
            use: { baseURL: supabaseBaseURL },
          },
        ]
      : []),
    {
      name: 'dashboard',
      testDir: './e2e/dashboard',
      use: { ...devices['Desktop Chrome'], baseURL: libsqlBaseURL },
    },
    {
      name: 'auth',
      testDir: './e2e/auth',
      use: { ...devices['Desktop Chrome'], baseURL: authBaseURL },
    },
    ...(visualEnabled
      ? [
          {
            name: 'visual',
            testDir: './e2e/visual',
            // The specs share one seeded agent and screenshot the list it
            // appears in, so they cannot be interleaved with each other.
            fullyParallel: false,
            use: { ...devices['Desktop Chrome'], baseURL: visualBaseURL },
          },
        ]
      : []),
  ],

  webServer: [
    /**
     * The stub AI provider. One process for the whole run, shared by both
     * storage backends: the gateway specs separate their traffic by model name
     * rather than by process, the same way other specs separate theirs by agent
     * name. Its `/__control` surface doubles as the readiness probe.
     */
    {
      command: 'node scripts/start-stub-provider.mjs',
      url: `http://127.0.0.1:${STUB_PORT}/__control/requests?model=ready`,
      env: { E2E_STUB_PORT: String(STUB_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
    },
    // Each libSQL server owns its database file, so the two cannot see each
    // other's writes and the projects stay independent.
    server(LIBSQL_PORT, { E2E_DB_NAME: 'main.db' }),
    server(AUTH_PORT, {
      E2E_DB_NAME: 'auth.db',
      E2E_ACCESS_PASSWORD: AUTH_PASSWORD,
    }),
    // Its own database, so the only agent the dashboard lists is the fixture.
    // Sharing 3100 would put whatever the contract specs happened to be
    // creating into the screenshot.
    ...(visualEnabled
      ? [server(VISUAL_PORT, { E2E_DB_NAME: 'visual.db' })]
      : []),
    ...(postgrestUrl
      ? [
          server(SUPABASE_PORT, {
            E2E_POSTGREST_URL: postgrestUrl,
            ...(process.env.E2E_POSTGREST_KEY
              ? { E2E_POSTGREST_KEY: process.env.E2E_POSTGREST_KEY }
              : {}),
          }),
        ]
      : []),
  ],
});
