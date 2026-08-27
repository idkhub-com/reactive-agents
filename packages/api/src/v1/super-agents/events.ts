import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';

/**
 * SSE Events Router
 *
 * NOTE: SSE (Server-Sent Events) is not supported on Cloudflare Workers
 * because Workers are designed for short request/response cycles,
 * not long-running connections.
 *
 * This endpoint returns a 501 Not Implemented response.
 * The client should handle this gracefully and fall back to polling
 * or disable real-time updates when running against Cloudflare Workers.
 *
 * For real-time functionality on Cloudflare, consider:
 * - Durable Objects with WebSockets
 * - Cloudflare Queues + polling
 * - Third-party services (Pusher, Ably, etc.)
 */
export const eventsRouter = new Hono<AppEnv>().get('/', (c) => {
  return c.json(
    {
      error: 'SSE not supported',
      message:
        'Server-Sent Events are not supported on Cloudflare Workers. Real-time updates are disabled.',
      code: 'SSE_NOT_SUPPORTED',
    },
    501,
  );
});
