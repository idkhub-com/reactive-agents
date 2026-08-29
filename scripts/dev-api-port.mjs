/**
 * How `pnpm dev` agrees on the API's port.
 *
 * In development the browser only ever talks to Vite, which proxies `/v1`
 * onwards -- the API's own port is an implementation detail nobody types. So
 * it is allocated from whatever the operating system has free rather than
 * hardcoded, which removes a whole class of failure: an unrelated project on
 * the same machine having already taken the port we assumed. (The previous
 * default, 8787, is Cloudflare's, so any other Workers project collided.)
 *
 * The cost is that Vite cannot know the target in advance. The two processes
 * start independently under Turborepo, so they agree through this file instead:
 * the API publishes the port it took, and Vite reads it per request.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Written by `packages/api/dev.js`, read by `packages/web/vite.config.ts`. */
export const apiPortFile = path.join(repoRoot, '.local-data', 'api-port');

/**
 * Ports to choose from: above the registered range, and below the ephemeral
 * range this kernel hands out (`/proc/sys/net/ipv4/ip_local_port_range`, 32768
 * upwards on Linux). Staying out of that range is the point -- see below.
 */
const PORT_FLOOR = 20000;
const PORT_CEILING = 32000;

/**
 * Is this port bindable the way the server will bind it?
 *
 * Listening without a host is what `@hono/node-server` does, which takes the
 * dual-stack wildcard (`::`). Probing `127.0.0.1` instead would report a port
 * free that then fails with `EADDRINUSE ... :::<port>`, because something else
 * holds the same port on another address.
 */
const isPortFree = (port) =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, () => {
      probe.close(() => resolve(true));
    });
  });

/**
 * Find a free port for the API.
 *
 * Deliberately not `listen(0)`: the kernel draws those from the ephemeral
 * range, which is the same pool it assigns source ports for outgoing
 * connections from. A port free at the moment it is probed can therefore be
 * taken by an unrelated connection before the server binds it -- a race that
 * shows up as an intermittent `EADDRINUSE` on a port nothing is listening on.
 * Choosing from below that range avoids competing with the kernel.
 *
 * A concrete port rather than letting the server take 0, because the server
 * needs one: `getApiUrl` builds the address the internal skills call this
 * process back on out of `PORT`, and a server told to listen on 0 would
 * advertise `localhost:0`.
 */
export const pickFreePort = async () => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate =
      PORT_FLOOR + Math.floor(Math.random() * (PORT_CEILING - PORT_FLOOR));
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Could not find a free port between ${PORT_FLOOR} and ${PORT_CEILING}. Set PORT to choose one.`,
  );
};

export const publishApiPort = (port) => {
  mkdirSync(path.dirname(apiPortFile), { recursive: true });
  writeFileSync(apiPortFile, `${port}\n`);
};

export const unpublishApiPort = () => {
  rmSync(apiPortFile, { force: true });
};

/** The published port, or undefined if the API has not started yet. */
export const readApiPort = () => {
  try {
    const port = Number(readFileSync(apiPortFile, 'utf8').trim());
    return Number.isInteger(port) && port > 0 ? port : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Wait for the API to publish a port.
 *
 * Vite usually wins the startup race -- it has far less to do than a first
 * esbuild bundle -- so without this the first `/v1` request of a session would
 * fail with a proxy error rather than simply waiting a moment.
 */
export const waitForApiPort = async (timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const port = readApiPort();
    if (port !== undefined) {
      return port;
    }
    if (Date.now() >= deadline) {
      return undefined;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};
