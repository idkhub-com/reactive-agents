import { serve } from '@hono/node-server';
import app from './v1';

const port = Number(process.env.PORT) || 8787;

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on http://0.0.0.0:${port}`);
