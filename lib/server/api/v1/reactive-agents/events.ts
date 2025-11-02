import type { AppEnv } from '@server/types/hono';
import { sseEventManager } from '@server/utils/sse-event-manager';
import { Hono } from 'hono';
import { stream } from 'hono/streaming';

/**
 * SSE Events Router
 *
 * IMPORTANT: This endpoint is protected by the global authenticatedMiddleware
 * applied in /lib/server/api/v1/index.ts. Authentication is validated before
 * this handler runs. Users must provide either:
 * 1. A valid JWT token in the 'access_token' cookie, OR
 * 2. A valid Bearer token in the Authorization header
 *
 * The middleware will return 401 Unauthorized if authentication fails.
 */
export const eventsRouter = new Hono<AppEnv>().get('/', (c) => {
  // Get user ID from JWT payload or use 'default' for bearer token auth
  // Note: authenticatedMiddleware ensures this code only runs for authenticated requests
  const jwtPayload = c.get('jwtPayload');
  const userId = jwtPayload?.sub || 'default';

  // Generate unique client ID
  const clientId = `${String(userId)}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  console.log(`[SSE] New connection request from user: ${userId}`);

  // Set SSE headers
  return stream(c, async (stream) => {
    // Set headers for SSE
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Register this client with the event manager
    sseEventManager.addClient(clientId, stream, userId);

    // Send initial connection message
    const initialMessage = JSON.stringify({
      type: 'connected',
      timestamp: Date.now(),
      data: { clientId },
    });
    await stream.write(`event: message\ndata: ${initialMessage}\n\n`);

    // Keep the connection open
    // The connection will be closed when the client disconnects
    // or when the server removes the client from the manager

    // Clean up on connection close
    c.req.raw.signal.addEventListener('abort', () => {
      console.log(`[SSE] Client ${clientId} connection aborted`);
      sseEventManager.removeClient(clientId);
    });

    // Keep stream alive - don't close it
    // The client will close it when needed
    await new Promise(() => {
      // This promise never resolves, keeping the connection open
      // The connection will be closed by the client or on abort
    });
  });
});
