import { serve } from '@hono/node-server';
import app from './v1';

const port = Number(process.env.PORT) || 8787;

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
