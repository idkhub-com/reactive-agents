import type { AppEnv } from '@api/types/hono';
import { getInFlightRequests } from '@api/utils/in-flight-requests';
import { sseEventManager } from '@api/utils/sse-event-manager';
import { Hono } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { streamSSE } from 'hono/streaming';

/**
 * SSE Events Router
 *
 * Streams mutation events to the dashboard, which turns each one into a React
 * Query invalidation. Without it the dashboard only ever shows what it fetched
 * on mount: everything driven by gateway traffic rather than by a click --
 * new logs, optimization progress, auto-created skills, judge scores -- sits
 * stale until someone reloads the page.
 *
 * The events themselves are already emitted from all over the API through
 * `emitSSEEvent`; this endpoint is the only thing that gives them somewhere
 * to go.
 *
 * **Not available on Workers**, where the endpoint keeps returning 501. Two
 * reasons, and the second is the fatal one: a Worker is billed for the
 * lifetime of a request, and `sseEventManager` holds its clients in a
 * module-scope Map, which on workerd is per-isolate -- a mutation handled by
 * one isolate cannot reach a stream held open by another, so most events
 * would simply be dropped. Real-time updates there need Durable Objects.
 * The client treats the 501 as "poll instead" rather than as an error.
 */

/** Runtimes whose isolate model or request lifetime rules out a held-open stream. */
const STREAMING_UNSUPPORTED_RUNTIMES = new Set([
  'workerd',
  'edge-light',
  'fastly',
]);

export const eventsRouter = new Hono<AppEnv>().get('/', (c) => {
  if (STREAMING_UNSUPPORTED_RUNTIMES.has(getRuntimeKey())) {
    return c.json(
      {
        error: 'SSE not supported',
        message:
          'Server-Sent Events are not supported on this runtime. The dashboard falls back to polling.',
        code: 'SSE_NOT_SUPPORTED',
      },
      501,
    );
  }

  return streamSSE(c, async (stream) => {
    const clientId = crypto.randomUUID();
    // Mirrors the SSE events middleware: a bearer-token caller has no JWT
    // payload, and shares the 'default' bucket with every other such caller.
    const userId = c.get('jwtPayload')?.sub || 'default';

    // Subscribe before the first `await`, not after. `onAbort` only calls
    // listeners that are registered when the abort arrives -- one added later
    // is never called at all -- and a client that hangs up during the opening
    // write would otherwise stay in the manager's map for the life of the
    // process, collecting every event nobody is there to read.
    const disconnected = new Promise<void>((resolve) => {
      stream.onAbort(resolve);
    });

    sseEventManager.addClient(clientId, stream, userId);

    try {
      // An immediate frame so the client's `onopen` is not the only evidence
      // the stream is live, and so any proxy in between flushes its headers.
      await stream.writeSSE({
        data: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
      });

      // Catch this client up on the requests already running, as the same
      // event a live arrival sends. Without it a dashboard opened (or
      // reloaded) during a slow request shows nothing until the next one
      // starts -- worst exactly when someone is watching to see if it works.
      for (const request of getInFlightRequests()) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'log:request-started',
            timestamp: Date.now(),
            data: request,
          }),
        });
      }

      // Hold the response open. The manager writes to `stream` from wherever
      // an event is emitted, and pings every 30s to keep the connection warm;
      // this only settles when the client goes away.
      await disconnected;
    } finally {
      sseEventManager.removeClient(clientId);
    }
  });
});
