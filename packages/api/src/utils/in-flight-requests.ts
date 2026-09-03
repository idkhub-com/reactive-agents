import { emitSSEEvent } from '@api/utils/sse-event-manager';
import type { InFlightRequest } from '@shared/types/sse';

/**
 * The gateway requests that are running right now.
 *
 * A log row is only written once a request has finished -- for a streaming
 * response, once the stream has ended -- so without this the dashboard has
 * nothing to show for work in progress, and a slow request looks like no
 * request at all. This registry is what the pending rows are drawn from: it
 * announces each request as it starts, and again to whoever connects while it
 * is still running.
 *
 * Deliberately in memory and deliberately not persisted. A request in flight
 * is by definition shorter-lived than the process holding it, and paying two
 * extra writes per request on the gateway's hot path to persist something
 * that is only interesting for its few seconds of life is a bad trade. The
 * cost of that choice is that these rows exist only where the SSE stream does
 * (see the events router).
 */

/** What is stored: the payload, plus when it actually started. */
type TrackedRequest = Omit<InFlightRequest, 'elapsed_ms'> & {
  started_at: number;
};

/**
 * A ceiling on the map, in case a request is never settled -- an isolate
 * killed mid-flight, say. Insertion order makes the oldest entry the first
 * one out, which is also the one most likely to be stale.
 */
const MAX_TRACKED_REQUESTS = 1000;

const inFlight = new Map<string, TrackedRequest>();

/**
 * Record a request as started and tell every connected dashboard.
 */
export function trackRequestStarted(
  request: Omit<InFlightRequest, 'elapsed_ms'>,
): void {
  if (inFlight.size >= MAX_TRACKED_REQUESTS) {
    const oldest = inFlight.keys().next().value;
    if (oldest !== undefined) {
      inFlight.delete(oldest);
    }
  }

  inFlight.set(request.request_id, { ...request, started_at: Date.now() });

  emitSSEEvent('log:request-started', { ...request, elapsed_ms: 0 });
}

/**
 * Record a request as finished. Safe to call more than once, and safe to call
 * for a request that was never tracked: only the first call that actually
 * removes something announces it.
 */
export function trackRequestSettled(requestId: string | undefined): void {
  if (!requestId || !inFlight.delete(requestId)) {
    return;
  }

  emitSSEEvent('log:request-settled', { request_id: requestId });
}

/**
 * Everything still running, with elapsed time measured as of now. Sent to a
 * dashboard when it connects, so a reload in the middle of a slow request
 * still shows it.
 */
export function getInFlightRequests(): InFlightRequest[] {
  const now = Date.now();

  return Array.from(inFlight.values()).map(
    ({ started_at, ...request }): InFlightRequest => ({
      ...request,
      elapsed_ms: now - started_at,
    }),
  );
}

/** Test seam: drop everything without announcing it. */
export function clearInFlightRequests(): void {
  inFlight.clear();
}
