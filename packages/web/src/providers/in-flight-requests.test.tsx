import type { SSEEventData, SSEEventType } from '@shared/types/sse';
import { act, renderHook } from '@testing-library/react';
import type { SSEEventHandler } from '@web/hooks/use-sse';
import {
  InFlightRequestsProvider,
  useInFlightRequests,
} from '@web/providers/in-flight-requests';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The handlers the provider registered, so a test can push events at it. */
const handlers = vi.hoisted(
  () => new Map<SSEEventType | '*', Set<SSEEventHandler>>(),
);

vi.mock('@web/providers/sse', () => ({
  useSSEStatus: () => ({
    connected: true,
    connecting: false,
    error: null,
    polling: false,
    subscribe: (eventType: SSEEventType | '*', handler: SSEEventHandler) => {
      if (!handlers.has(eventType)) {
        handlers.set(eventType, new Set());
      }
      handlers.get(eventType)?.add(handler);
      return () => {
        handlers.get(eventType)?.delete(handler);
      };
    },
  }),
}));

const emit = (event: SSEEventData) => {
  for (const handler of handlers.get(event.type) ?? []) {
    handler(event);
  }
};

const startedEvent = (
  overrides: Record<string, unknown> = {},
): SSEEventData => ({
  type: 'log:request-started',
  timestamp: Date.now(),
  data: {
    request_id: 'req-1',
    agent_id: 'agent-1',
    skill_id: 'skill-1',
    method: 'POST',
    endpoint: '/v1/chat/completions',
    function_name: 'chatComplete',
    model: 'gpt-5.6',
    elapsed_ms: 0,
    ...overrides,
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <InFlightRequestsProvider>{children}</InFlightRequestsProvider>
);

describe('InFlightRequestsProvider', () => {
  beforeEach(() => {
    handlers.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds a request from the moment it starts until it settles', () => {
    const { result } = renderHook(() => useInFlightRequests(), { wrapper });

    expect(result.current.pendingRequests).toHaveLength(0);

    act(() => emit(startedEvent()));
    expect(result.current.pendingRequests).toHaveLength(1);
    expect(result.current.pendingRequests[0]?.endpoint).toBe(
      '/v1/chat/completions',
    );

    act(() =>
      emit({
        type: 'log:request-settled',
        timestamp: Date.now(),
        data: { request_id: 'req-1' },
      }),
    );
    expect(result.current.pendingRequests).toHaveLength(0);
  });

  it('counts up from what the server had already measured', () => {
    const { result } = renderHook(() => useInFlightRequests(), { wrapper });

    // A request replayed on connect arrives already part-way through.
    act(() => emit(startedEvent({ elapsed_ms: 4000 })));

    const request = result.current.pendingRequests[0];
    if (!request) throw new Error('expected a pending request');

    expect(result.current.elapsedMs(request)).toBeGreaterThanOrEqual(4000);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // The server's 4s plus the second the browser has counted since.
    expect(result.current.elapsedMs(request)).toBeGreaterThanOrEqual(5000);
    expect(result.current.elapsedMs(request)).toBeLessThan(5500);
  });

  it('narrows to the scope the caller is showing', () => {
    const { result: agentScoped } = renderHook(
      () => useInFlightRequests('agent-1', null),
      { wrapper },
    );
    const { result: otherSkill } = renderHook(
      () => useInFlightRequests('agent-1', 'skill-2'),
      { wrapper },
    );
    const { result: otherAgent } = renderHook(
      () => useInFlightRequests('agent-2', null),
      { wrapper },
    );

    act(() => emit(startedEvent()));

    expect(agentScoped.current.pendingRequests).toHaveLength(1);
    expect(otherSkill.current.pendingRequests).toHaveLength(0);
    expect(otherAgent.current.pendingRequests).toHaveLength(0);
  });

  it('ignores a malformed event rather than rendering a broken row', () => {
    const { result } = renderHook(() => useInFlightRequests(), { wrapper });

    act(() =>
      emit({
        type: 'log:request-started',
        timestamp: Date.now(),
        data: { request_id: 'req-1' },
      }),
    );

    expect(result.current.pendingRequests).toHaveLength(0);
  });

  it('sweeps away a row whose settled event never arrived', () => {
    const { result } = renderHook(() => useInFlightRequests(), { wrapper });

    act(() => emit(startedEvent()));
    expect(result.current.pendingRequests).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000);
    });

    expect(result.current.pendingRequests).toHaveLength(0);
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useInFlightRequests())).toThrow(
      'useInFlightRequests must be used within an InFlightRequestsProvider',
    );
  });
});
