import { act, renderHook } from '@testing-library/react';
import { useSSE } from '@web/hooks/use-sse';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The EventSource client behind the dashboard's live updates.
 *
 * Two of these are regressions. The hook used to read its reconnect count
 * from state, so every failed attempt gave `connect` a new identity and the
 * mount effect tore the connection down and rebuilt it -- a reconnect loop
 * dressed up as a retry policy. And `subscribe` was recreated on every
 * render, so a consumer registering it in an effect resubscribed constantly.
 */

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static get latest(): MockEventSource {
    const instance =
      MockEventSource.instances[MockEventSource.instances.length - 1];
    if (!instance) throw new Error('No EventSource was opened');
    return instance;
  }
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens one connection, not one per render', () => {
    const { rerender } = renderHook(() => useSSE('/events'));

    rerender();
    rerender();

    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('keeps `subscribe` stable across renders', () => {
    const { result, rerender } = renderHook(() => useSSE('/events'));

    const first = result.current.subscribe;
    rerender();

    expect(result.current.subscribe).toBe(first);
  });

  it('retries a failed connection without tearing down the one it opens', () => {
    renderHook(() => useSSE('/events'));

    act(() => {
      MockEventSource.latest.onerror?.();
      vi.advanceTimersByTime(9000);
    });

    // One retry means exactly one more stream, not a loop of them.
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[0]?.closed).toBe(true);
  });

  it('gives up after the attempt limit and reports it', () => {
    const { result } = renderHook(() => useSSE('/events'));

    for (let attempt = 0; attempt < 5; attempt++) {
      act(() => {
        MockEventSource.latest.onerror?.();
        vi.advanceTimersByTime(9000);
      });
    }

    expect(MockEventSource.instances).toHaveLength(5);
    expect(result.current.connectionState.degraded).toBe(true);
    expect(result.current.connectionState.connected).toBe(false);
  });

  it('forgets earlier failures once a connection opens', () => {
    const { result } = renderHook(() => useSSE('/events'));

    act(() => {
      MockEventSource.latest.onerror?.();
      vi.advanceTimersByTime(9000);
    });
    act(() => {
      MockEventSource.latest.onopen?.();
    });

    expect(result.current.connectionState.connected).toBe(true);
    expect(result.current.connectionState.reconnectAttempts).toBe(0);
    expect(result.current.connectionState.degraded).toBe(false);
  });

  it('delivers events to the handlers subscribed to their type', () => {
    const { result } = renderHook(() => useSSE('/events'));
    const specific = vi.fn();
    const wildcard = vi.fn();

    act(() => {
      result.current.subscribe('log:created', specific);
      result.current.subscribe('*', wildcard);
      MockEventSource.latest.onopen?.();
      MockEventSource.latest.onmessage?.({
        data: JSON.stringify({ type: 'log:created', timestamp: 1 }),
      });
    });

    expect(specific).toHaveBeenCalledTimes(1);
    expect(wildcard).toHaveBeenCalledTimes(1);
  });

  it('stops delivering to a handler that unsubscribed', () => {
    const { result } = renderHook(() => useSSE('/events'));
    const handler = vi.fn();

    act(() => {
      const unsubscribe = result.current.subscribe('log:created', handler);
      unsubscribe();
      MockEventSource.latest.onmessage?.({
        data: JSON.stringify({ type: 'log:created', timestamp: 1 }),
      });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not connect when disabled', () => {
    renderHook(() => useSSE('/events', { enabled: false }));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('survives a frame that is not JSON', () => {
    const { result } = renderHook(() => useSSE('/events'));
    const handler = vi.fn();

    act(() => {
      result.current.subscribe('*', handler);
      MockEventSource.latest.onmessage?.({ data: 'not json' });
      MockEventSource.latest.onmessage?.({ data: '' });
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
