'use client';

import { InFlightRequest } from '@shared/types/sse';
import { useSSEStatus } from '@web/providers/sse';
import type { ReactElement, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * A request the gateway is running right now, as the dashboard tracks it.
 *
 * Elapsed time is kept as the server's figure at the moment the event
 * arrived, plus whatever the browser has counted since. Neither clock has to
 * agree with the other, and a row picked up mid-flight after a reload still
 * starts from the right number.
 */
export interface PendingRequest extends InFlightRequest {
  /** `performance.now()` when this arrived, to measure the client's share. */
  received_at: number;
}

interface InFlightRequestsContextType {
  /** Everything running, newest first. */
  pendingRequests: PendingRequest[];
  /** How long a request has been running, in milliseconds, as of now. */
  elapsedMs: (request: PendingRequest) => number;
}

const InFlightRequestsContext = createContext<
  InFlightRequestsContextType | undefined
>(undefined);

/**
 * A pending row can only outlive its request if the event that ends it never
 * arrives -- a dropped stream, a server restart mid-request. Rows older than
 * this are dropped on their own, so a stuck one cannot tick forever.
 */
const MAX_PENDING_AGE_MS = 10 * 60 * 1000;

/** How often to look for those. Nowhere near the tick rate; this is a sweeper. */
const SWEEP_INTERVAL_MS = 30 * 1000;

/**
 * Tracks the requests the gateway is running, from the events the API pushes
 * as they start and finish.
 *
 * Nothing here is fetched or cached: an in-flight request is not a row in a
 * table yet, and it stops existing the moment it becomes one. What makes it
 * worth showing is that a log only appears once its request has finished, so
 * without this a slow request is indistinguishable from no request at all.
 */
export function InFlightRequestsProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const { subscribe } = useSSEStatus();
  const [pending, setPending] = useState<Map<string, PendingRequest>>(
    () => new Map(),
  );

  useEffect(() => {
    const unsubscribeStarted = subscribe('log:request-started', (event) => {
      const parsed = InFlightRequest.safeParse(event.data);
      if (!parsed.success) {
        return;
      }

      setPending((current) => {
        const next = new Map(current);
        next.set(parsed.data.request_id, {
          ...parsed.data,
          received_at: performance.now(),
        });
        return next;
      });
    });

    const unsubscribeSettled = subscribe('log:request-settled', (event) => {
      const requestId = event.data?.request_id;
      if (typeof requestId !== 'string') {
        return;
      }

      setPending((current) => {
        if (!current.has(requestId)) {
          return current;
        }
        const next = new Map(current);
        next.delete(requestId);
        return next;
      });
    });

    return () => {
      unsubscribeStarted();
      unsubscribeSettled();
    };
  }, [subscribe]);

  // Drop rows whose settled event never arrived.
  useEffect(() => {
    const sweep = setInterval(() => {
      setPending((current) => {
        const now = performance.now();
        const stale = Array.from(current.values()).filter(
          (request) =>
            request.elapsed_ms + (now - request.received_at) >
            MAX_PENDING_AGE_MS,
        );
        if (stale.length === 0) {
          return current;
        }

        const next = new Map(current);
        for (const request of stale) {
          next.delete(request.request_id);
        }
        return next;
      });
    }, SWEEP_INTERVAL_MS);

    return () => clearInterval(sweep);
  }, []);

  const elapsedMs = useCallback(
    (request: PendingRequest) =>
      request.elapsed_ms + (performance.now() - request.received_at),
    [],
  );

  const value = useMemo<InFlightRequestsContextType>(() => {
    // Newest first, matching the order the logs list is served in.
    const pendingRequests = Array.from(pending.values()).sort(
      (a, b) => b.received_at - a.received_at,
    );
    return { pendingRequests, elapsedMs };
  }, [pending, elapsedMs]);

  return (
    <InFlightRequestsContext.Provider value={value}>
      {children}
    </InFlightRequestsContext.Provider>
  );
}

/**
 * The requests running right now, optionally narrowed to one agent or skill.
 *
 * Pass the scope the caller is showing; a view of one skill should not show a
 * request belonging to another. `skillId` of null means the whole agent.
 */
export function useInFlightRequests(
  agentId?: string | null,
  skillId?: string | null,
): InFlightRequestsContextType {
  const context = useContext(InFlightRequestsContext);
  if (!context) {
    throw new Error(
      'useInFlightRequests must be used within an InFlightRequestsProvider',
    );
  }

  const { pendingRequests, elapsedMs } = context;

  const scoped = useMemo(() => {
    if (!agentId) {
      return pendingRequests;
    }
    return pendingRequests.filter(
      (request) =>
        request.agent_id === agentId &&
        (!skillId || request.skill_id === skillId),
    );
  }, [pendingRequests, agentId, skillId]);

  return { pendingRequests: scoped, elapsedMs };
}
