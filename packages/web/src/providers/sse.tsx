'use client';

import type { SSEEventData, SSEEventType } from '@shared/types/sse';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStatus } from '@web/hooks/use-auth-status';
import { type SSEEventHandler, useSSE } from '@web/hooks/use-sse';
import type React from 'react';
import {
  createContext,
  type ReactElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

interface SSEContextType {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  /**
   * True when the server has no event stream to give us and the dashboard is
   * polling instead. Not a failure -- it is the normal state on Workers.
   */
  polling: boolean;
  /**
   * Listen for events directly, for the ones that are not a cache
   * invalidation -- a request starting and finishing is transient state that
   * belongs to no query. Returns an unsubscribe function.
   */
  subscribe: (
    eventType: SSEEventType | '*',
    handler: SSEEventHandler,
  ) => () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

/** The endpoint the API serves the stream from. Vite proxies `/v1` in dev. */
const EVENTS_URL = '/v1/super-agents/events';

/**
 * How long to gather events before invalidating. A busy gateway emits a
 * `log:created` per request, and without this each one would land as its own
 * refetch of the logs list.
 */
const INVALIDATION_COALESCE_MS = 400;

/** How often to refetch the live views when there is no stream to listen to. */
const POLL_INTERVAL_MS = 30 * 1000;

/**
 * The root of every cache this file can invalidate, spelled out rather than
 * imported from the providers that own them.
 *
 * This module is loaded by anything that listens for events, which is close
 * to everything; importing nine provider modules to read one constant from
 * each dragged all of them, and their module-scope side effects, along with
 * it. `sse-query-keys.test.tsx` checks these against the factories, so the
 * duplication cannot drift unnoticed.
 */
const agentsKey = ['agents'] as const;
const skillsKey = ['skills'] as const;
const logsKey = ['logs'] as const;
const modelsKey = ['models'] as const;
const aiProvidersKey = ['ai-providers'] as const;
const evaluationsKey = ['evaluations'] as const;
const armsKey = ['skillOptimizationArms'] as const;
const clustersKey = ['skillOptimizationClusters'] as const;
const evaluationRunsKey = ['skillOptimizationEvaluationRuns'] as const;

/**
 * The `skill-events` provider builds its key inline from its filters rather
 * than through a factory, so the prefix is spelled out here.
 */
const skillEventsKey = ['skillEvents'] as const;

/** Validation and readiness derive from skills and models, under their own keys. */
const agentValidationKey = ['agent-validation'] as const;
const agentUnreadySkillsKey = ['agent-unready-skills'] as const;
const agentUnreadySkillsDataKey = ['agent-unready-skills-data'] as const;
const skillValidationModelsKey = ['skill-validation-models'] as const;
const skillValidationEvaluationsKey = ['skill-validation-evaluations'] as const;
const feedbackKey = ['feedback'] as const;

/**
 * What each event makes stale.
 *
 * Keys are prefixes: React Query matches them against every query key that
 * starts with them, and only *active* queries actually refetch, so naming a
 * whole resource is cheap and misses nothing.
 */
const EVENT_QUERY_KEYS: Record<
  Exclude<SSEEventType, 'ping'>,
  readonly (readonly unknown[])[]
> = {
  'agent:created': [agentsKey],
  'agent:updated': [agentsKey, agentValidationKey],
  'agent:deleted': [agentsKey],

  // A skill appearing or changing moves its agent's readiness with it.
  'skill:created': [
    skillsKey,
    agentsKey,
    agentUnreadySkillsKey,
    agentUnreadySkillsDataKey,
    agentValidationKey,
  ],
  'skill:updated': [
    skillsKey,
    agentUnreadySkillsKey,
    agentUnreadySkillsDataKey,
    skillValidationModelsKey,
    skillValidationEvaluationsKey,
  ],
  'skill:deleted': [
    skillsKey,
    agentsKey,
    agentUnreadySkillsKey,
    agentUnreadySkillsDataKey,
  ],
  'skill:reset': [skillsKey, clustersKey, armsKey, skillEventsKey],

  'model:created': [modelsKey, agentValidationKey],
  'model:updated': [modelsKey, agentValidationKey],
  'model:deleted': [modelsKey, agentValidationKey],

  'evaluation:created': [evaluationsKey, skillValidationEvaluationsKey],
  'evaluation:updated': [evaluationsKey, skillValidationEvaluationsKey],
  'evaluation:deleted': [evaluationsKey, skillValidationEvaluationsKey],

  'ai-provider:created': [aiProvidersKey],
  'ai-provider:updated': [aiProvidersKey],
  'ai-provider:deleted': [aiProvidersKey, modelsKey],

  'log:created': [logsKey],
  // These two carry no stored data with them: a request that has started has
  // changed nothing to refetch, and the one that finishes is announced by the
  // `log:created` above. The in-flight provider consumes them directly.
  'log:request-started': [],
  'log:request-settled': [],

  'skill-optimization:arm-updated': [armsKey],
  'skill-optimization:cluster-updated': [clustersKey, armsKey],
  'skill-optimization:evaluation-run-created': [evaluationRunsKey],
  'skill-optimization:evaluation-run-updated': [evaluationRunsKey],
  'skill-optimization:evaluations-regenerated': [
    evaluationsKey,
    skillValidationEvaluationsKey,
  ],
  'skill-optimization:event-created': [skillEventsKey],
  'cluster:reset': [clustersKey, armsKey, skillEventsKey],

  'feedback:created': [feedbackKey, logsKey],
  'improved-response:created': [feedbackKey, logsKey],
};

/**
 * What polling refetches when the stream is unavailable: everything that
 * changes on its own, driven by gateway traffic rather than by a click.
 */
const POLLED_QUERY_KEYS: readonly (readonly unknown[])[] = [
  logsKey,
  skillEventsKey,
  armsKey,
  clustersKey,
  evaluationRunsKey,
  skillsKey,
  agentsKey,
];

/**
 * SSE Provider
 *
 * Holds the dashboard's connection to the API's event stream and turns each
 * event into a React Query invalidation, so a view reflects work the server
 * did on its own -- a request logged, a skill created, an optimization step --
 * without anyone reloading the page.
 *
 * Where the server cannot stream (Workers answers the endpoint with 501) the
 * hook gives up after a few attempts and this provider polls the same keys
 * instead. Consumers do not need to know which of the two is happening;
 * `useSSEStatus` reports it for anything that wants to show a live indicator.
 */
export const SSEProvider = ({
  children,
}: {
  children: React.ReactNode;
}): ReactElement => {
  const queryClient = useQueryClient();
  const authStatus = useAuthStatus();

  // Don't open a stream we know will be refused. `null` means the status has
  // not loaded yet, and an unauthenticated dashboard renders the login page.
  const enabled = authStatus?.authenticated === true;

  const { connectionState, subscribe } = useSSE(EVENTS_URL, { enabled });

  // Pending invalidations, coalesced so a burst of events costs one refetch.
  const pendingKeysRef = useRef<Map<string, readonly unknown[]>>(new Map());
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const flush = () => {
      flushTimeoutRef.current = null;
      const keys = Array.from(pendingKeysRef.current.values());
      pendingKeysRef.current.clear();
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    const unsubscribe = subscribe('*', (event: SSEEventData) => {
      const keys =
        EVENT_QUERY_KEYS[event.type as Exclude<SSEEventType, 'ping'>];
      if (!keys) {
        return;
      }

      for (const key of keys) {
        // Keyed by serialisation so the same prefix arriving from several
        // events in one burst is invalidated once.
        pendingKeysRef.current.set(JSON.stringify(key), key);
      }

      if (flushTimeoutRef.current === null) {
        flushTimeoutRef.current = setTimeout(flush, INVALIDATION_COALESCE_MS);
      }
    });

    return () => {
      unsubscribe();
      if (flushTimeoutRef.current !== null) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
    };
  }, [subscribe, queryClient]);

  // Fall back to polling when there is no stream to listen to.
  const polling = enabled && connectionState.degraded;

  useEffect(() => {
    if (!polling) {
      return;
    }

    const interval = setInterval(() => {
      for (const queryKey of POLLED_QUERY_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [polling, queryClient]);

  const contextValue = useMemo<SSEContextType>(
    () => ({
      connected: connectionState.connected,
      connecting: connectionState.connecting,
      error: connectionState.error,
      polling,
      subscribe,
    }),
    [
      connectionState.connected,
      connectionState.connecting,
      connectionState.error,
      polling,
      subscribe,
    ],
  );

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
};

/**
 * Hook to access SSE connection status
 */
export const useSSEStatus = (): SSEContextType => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEStatus must be used within an SSEProvider');
  }
  return context;
};
