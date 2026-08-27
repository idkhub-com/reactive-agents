import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type MiddlewareHandler } from 'hono';
import { compress } from 'hono/compress';
import api from './v1';

const port = Number(process.env.PORT) || 3000;

/**
 * Directory holding the built dashboard, relative to the working directory the
 * process was started from. `serveStatic` does not accept absolute paths.
 */
const dashboardRoot = process.env.DASHBOARD_ROOT || './public';

/**
 * The dashboard is served from this process unless it was turned off
 * explicitly, or the build simply isn't there. The API-only image ships
 * without `public/`, so the check keeps that image working untouched, and
 * `SERVE_DASHBOARD=false` covers gateway-only deployments of the full image.
 */
const serveDashboard =
  process.env.SERVE_DASHBOARD !== 'false' && existsSync(dashboardRoot);

/**
 * Headers the nginx web container used to add to every response. Kept as-is so
 * that collapsing the two containers doesn't change the security posture.
 */
const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-XSS-Protection', '1; mode=block');
};

const app = new Hono()
  .use('*', securityHeaders)
  .get('/health', (c) => c.text('OK'))
  /**
   * The API carries its own `/v1` base path, so mounting it at the root
   * registers every route under `/v1` and leaves the rest of the URL space to
   * the dashboard.
   */
  .route('/', api);

/**
 * Anything left under `/v1` has to 404 as JSON, because the SPA fallback below
 * would otherwise answer a mistyped endpoint with `index.html` and a 200 —
 * a confusing failure for an API client.
 *
 * `commonVariablesMiddleware` already does this for the gateway endpoints, but
 * it deliberately skips `/v1/super-agents/*`, so that subtree would fall
 * through to the dashboard without this.
 */
app.all('/v1/*', (c) => c.json({ error: 'Not Found' }, 404));

if (serveDashboard) {
  // Vite writes content-hashed filenames into `assets/`, so they can be cached
  // indefinitely. This mirrors the `expires 1y` block from nginx.conf.
  app.use(
    '/assets/*',
    compress(),
    serveStatic({
      root: dashboardRoot,
      onFound: (_path, c) => {
        c.header('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );

  // Unhashed files that ship alongside the bundle (favicon, manifest, images).
  app.use('*', serveStatic({ root: dashboardRoot }));

  // SPA fallback: any remaining path is a client-side route.
  app.get('*', serveStatic({ path: `${dashboardRoot}/index.html` }));
}

console.log(`Starting server on port ${port}...`);

serve({
  /**
   * `@hono/node-server` passes `{ incoming, outgoing }` as the Hono env, so
   * `c.env` would otherwise be empty of configuration. Merge `process.env` in
   * so the `@api/constants` getters resolve on Node the same way bindings
   * resolve on Cloudflare Workers.
   */
  fetch: (request, env) => app.fetch(request, { ...process.env, ...env }),
  port,
});

console.log(`Server is running on http://0.0.0.0:${port}`);
console.log(
  serveDashboard
    ? `Dashboard served from ${dashboardRoot}`
    : 'Dashboard not served (API only)',
);
