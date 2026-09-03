import type { SSEEventData } from '@shared/types/sse';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook } from '@testing-library/react';
import { SSEProvider, useSSEStatus } from '@web/providers/sse';
import type { ReactNode } from 'react';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthStatus = vi.hoisted(() => ({
  value: { authRequired: false, authenticated: true } as {
    authRequired: boolean;
    authenticated: boolean;
  } | null,
}));

vi.mock('@web/hooks/use-auth-status', () => ({
  authStatusQueryKeys: {
    all: ['auth-status'] as const,
    detail: () => ['auth-status', 'detail'] as const,
  },
  useAuthStatus: () => mockAuthStatus.value,
}));

/**
 * jsdom ships no EventSource, so the tests drive one by hand: `instances`
 * gives each test the stream the provider opened.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(
    public url: string,
    public init?: { withCredentials?: boolean },
  ) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  /** Pretend the server accepted the connection. */
  open() {
    this.onopen?.();
  }

  /** Pretend the server pushed an event. */
  emit(event: SSEEventData) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }

  /** Pretend the connection failed (a refusal, or a dropped socket). */
  fail() {
    this.onerror?.();
  }

  static get latest(): MockEventSource {
    const instance =
      MockEventSource.instances[MockEventSource.instances.length - 1];
    if (!instance) {
      throw new Error('No EventSource was opened');
    }
    return instance;
  }
}

describe('SSEProvider', () => {
  let queryClient: QueryClient;
  let invalidateSpy: MockInstance<QueryClient['invalidateQueries']>;

  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    mockAuthStatus.value = { authRequired: false, authenticated: true };
    vi.stubGlobal('EventSource', MockEventSource);

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    invalidateSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SSEProvider>{children}</SSEProvider>
    </QueryClientProvider>
  );

  /** The prefixes passed to invalidateQueries so far, serialised for matching. */
  const invalidatedKeys = (): string[] =>
    invalidateSpy.mock.calls.map(([filters]) =>
      JSON.stringify(filters?.queryKey),
    );

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useSSEStatus());
    }).toThrow('useSSEStatus must be used within an SSEProvider');
  });

  it('opens the events stream with credentials', () => {
    render(<div />, { wrapper });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.latest.url).toBe('/v1/super-agents/events');
    expect(MockEventSource.latest.init?.withCredentials).toBe(true);
  });

  it('does not open a stream when the dashboard is unauthenticated', () => {
    mockAuthStatus.value = { authRequired: true, authenticated: false };

    render(<div />, { wrapper });

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('reports connected once the stream opens', () => {
    const { result } = renderHook(() => useSSEStatus(), { wrapper });

    expect(result.current.connected).toBe(false);

    act(() => {
      MockEventSource.latest.open();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.polling).toBe(false);
  });

  it('invalidates the logs cache when a log is created', () => {
    render(<div />, { wrapper });

    act(() => {
      MockEventSource.latest.open();
      MockEventSource.latest.emit({
        type: 'log:created',
        timestamp: Date.now(),
      });
    });

    // Coalesced: nothing is invalidated until the window closes.
    expect(invalidateSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(invalidatedKeys()).toContain(JSON.stringify(['logs']));
  });

  it('invalidates skills and agent readiness when a skill is created', () => {
    render(<div />, { wrapper });

    act(() => {
      MockEventSource.latest.open();
      MockEventSource.latest.emit({
        type: 'skill:created',
        timestamp: Date.now(),
      });
      vi.advanceTimersByTime(500);
    });

    const keys = invalidatedKeys();
    expect(keys).toContain(JSON.stringify(['skills']));
    expect(keys).toContain(JSON.stringify(['agents']));
    expect(keys).toContain(JSON.stringify(['agent-unready-skills']));
  });

  it('coalesces a burst of identical events into one invalidation', () => {
    render(<div />, { wrapper });

    act(() => {
      MockEventSource.latest.open();
      for (let i = 0; i < 20; i++) {
        MockEventSource.latest.emit({
          type: 'log:created',
          timestamp: Date.now(),
        });
      }
      vi.advanceTimersByTime(500);
    });

    const logInvalidations = invalidatedKeys().filter(
      (key) => key === JSON.stringify(['logs']),
    );
    expect(logInvalidations).toHaveLength(1);
  });

  it('ignores ping frames', () => {
    render(<div />, { wrapper });

    act(() => {
      MockEventSource.latest.open();
      MockEventSource.latest.emit({ type: 'ping', timestamp: Date.now() });
      vi.advanceTimersByTime(500);
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('falls back to polling once the endpoint has refused every attempt', () => {
    const { result } = renderHook(() => useSSEStatus(), { wrapper });

    // Five refusals, each followed by the reconnect delay.
    for (let attempt = 0; attempt < 5; attempt++) {
      act(() => {
        MockEventSource.latest.fail();
        vi.advanceTimersByTime(9000);
      });
    }

    expect(result.current.connected).toBe(false);
    expect(result.current.polling).toBe(true);

    // Stops opening new streams: five is the cap.
    expect(MockEventSource.instances).toHaveLength(5);

    invalidateSpy.mockClear();
    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(invalidatedKeys()).toContain(JSON.stringify(['logs']));
  });
});
