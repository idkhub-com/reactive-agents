#!/usr/bin/env node
/**
 * Development server for the API, on Node.
 *
 * The API has two entrypoints -- `src/index.ts` for Cloudflare Workers and
 * `src/server.ts` for Node -- and this runs the Node one, which is also what
 * the published image runs. That choice is what lets development use an
 * embedded SQLite database: a Worker has no filesystem, so on workerd
 * `@libsql/client` resolves to its HTTP-only build and a `file:` URL is
 * rejected outright. Nothing else about the two runtimes differs here; both
 * wrap the same Hono app.
 *
 * Use `pnpm dev:api:worker` to run the same code on workerd instead. That is
 * still the only way to catch a `node:` builtin that Workers does not
 * implement, because wrangler's unenv layer stubs those at bundle time and the
 * stub throws only when it is called -- see `scripts/check-worker-runtime.sh`.
 *
 * Rebuilds on change and restarts the server; a build that fails leaves the
 * previous one running, so a typo mid-edit does not take the API down.
 *
 * Overridable through the environment:
 *
 *   PORT        what to listen on (default: a free port chosen at startup and
 *               published for Vite to proxy to -- see scripts/dev-api-port.mjs)
 *   LIBSQL_URL  the database (default `.local-data/dev.db` in the repo root).
 *               Set it empty to develop against Supabase instead.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { connect } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import {
  pickFreePort,
  publishApiPort,
  unpublishApiPort,
} from '../../scripts/dev-api-port.mjs';
import { buildOptions, outfile } from './esbuild.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');

// SQLite creates the database file but not the directory above it, and
// migrations run lazily on the first request, so a missing directory would
// surface as a failed query rather than a failed startup.
const dataDir = path.join(repoRoot, '.local-data');
mkdirSync(dataDir, { recursive: true });

/**
 * A concrete port, chosen once for the whole session so that restarts on
 * rebuild keep the same address. Vite reads it from the file published below,
 * and `getApiUrl` derives the address the internal skills call this process
 * back on from the same value.
 */
const port = process.env.PORT ?? String(await pickFreePort());
publishApiPort(port);

const childEnv = {
  ...process.env,
  PORT: port,
  // `??` rather than `||` on purpose: an explicitly empty LIBSQL_URL selects
  // Supabase, which is how you develop against the other backend.
  LIBSQL_URL: process.env.LIBSQL_URL ?? `file:${path.join(dataDir, 'dev.db')}`,
  // Vite serves the dashboard in development, so this process is API-only.
  SERVE_DASHBOARD: 'false',
  // The runtime port is not an address anyone should use, so the server does
  // not print it. Vite prints where to send requests instead, once it knows
  // which port it took.
  SA_QUIET_BANNER: 'true',
};

let child;

const stopChild = () =>
  new Promise((resolve) => {
    if (!child) {
      resolve();
      return;
    }
    const dying = child;
    child = undefined;
    dying.once('exit', resolve);
    dying.kill('SIGTERM');
  });

const startChild = () => {
  child = spawn(process.execPath, [outfile], {
    stdio: 'inherit',
    env: childEnv,
  });
  const started = child;
  child.once('exit', (code, signal) => {
    // Only report a crash. A restart kills the previous process itself, and
    // `stopChild` has already cleared `child` by the time that exit arrives.
    if (child === started && code !== 0) {
      console.error(
        `API exited (${signal ?? `code ${code}`}). Waiting for the next change.`,
      );
      child = undefined;
    }
  });
};

/**
 * Restarts are serialised through a promise chain because esbuild can finish
 * two builds in quick succession, and overlapping restarts would race to bind
 * the port -- the second server would then die with EADDRINUSE.
 */
let pending = Promise.resolve();
const restart = () => {
  pending = pending
    .then(stopChild)
    .then(startChild)
    .catch((error) => {
      console.error('Could not restart the API:', error);
    });
};

const context = await esbuild.context({
  ...buildOptions,
  logLevel: 'silent',
  plugins: [
    {
      name: 'restart-api',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0) {
            for (const message of result.errors) {
              console.error(`${message.text}`);
            }
            console.error(`Build failed; the previous API is still running.`);
            return;
          }
          restart();
        });
      },
    },
  ],
});

const shutdown = async () => {
  await stopChild();
  await context.dispose();
  // Leaving the file behind would point the next Vite at a port nothing is
  // listening on, and the wait on startup would never fire.
  unpublishApiPort();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * The port below is deliberately not the one to send requests to. Vite serves
 * the dashboard and proxies `/v1` on to this process, so a request made
 * against the dashboard's origin reaches the API with no CORS and no second
 * address to remember -- which is also the shape production has, where one
 * process serves both. Vite says so itself once it has a port; labelling this
 * one "internal" keeps it from reading like an endpoint in the meantime.
 */
console.log(`API process on port ${port} (internal; Vite proxies /v1 to it)`);
console.log(
  `Database ${childEnv.LIBSQL_URL || '(none set -- using Supabase)'}`,
);

await context.watch();
