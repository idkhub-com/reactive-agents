import {
  clearInFlightRequests,
  getInFlightRequests,
  trackRequestSettled,
  trackRequestStarted,
} from '@api/utils/in-flight-requests';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emitSSEEvent = vi.hoisted(() => vi.fn());

vi.mock('@api/utils/sse-event-manager', () => ({
  emitSSEEvent,
}));

const aRequest = (requestId: string) => ({
  request_id: requestId,
  agent_id: 'agent-1',
  skill_id: 'skill-1',
  method: 'POST',
  endpoint: '/v1/chat/completions',
  function_name: 'chatComplete',
  model: 'gpt-5.6',
});

describe('in-flight requests', () => {
  beforeEach(() => {
    clearInFlightRequests();
    emitSSEEvent.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearInFlightRequests();
  });

  it('announces a request as it starts', () => {
    trackRequestStarted(aRequest('req-1'));

    expect(emitSSEEvent).toHaveBeenCalledWith(
      'log:request-started',
      expect.objectContaining({ request_id: 'req-1', elapsed_ms: 0 }),
    );
    expect(getInFlightRequests()).toHaveLength(1);
  });

  it('reports how long each request has been running', () => {
    trackRequestStarted(aRequest('req-1'));
    vi.advanceTimersByTime(2500);
    trackRequestStarted(aRequest('req-2'));

    const running = getInFlightRequests();
    expect(running.find((r) => r.request_id === 'req-1')?.elapsed_ms).toBe(
      2500,
    );
    expect(running.find((r) => r.request_id === 'req-2')?.elapsed_ms).toBe(0);
  });

  it('drops a request when it settles, and says so once', () => {
    trackRequestStarted(aRequest('req-1'));
    emitSSEEvent.mockClear();

    trackRequestSettled('req-1');
    expect(getInFlightRequests()).toHaveLength(0);
    expect(emitSSEEvent).toHaveBeenCalledExactlyOnceWith(
      'log:request-settled',
      { request_id: 'req-1' },
    );

    // The middleware settles again as a backstop; that must stay silent.
    trackRequestSettled('req-1');
    expect(emitSSEEvent).toHaveBeenCalledTimes(1);
  });

  it('ignores settling something it never tracked', () => {
    trackRequestSettled('never-started');
    trackRequestSettled(undefined);

    expect(emitSSEEvent).not.toHaveBeenCalled();
  });

  it('caps the map so a request that never settles cannot leak forever', () => {
    for (let i = 0; i < 1100; i++) {
      trackRequestStarted(aRequest(`req-${i}`));
    }

    const running = getInFlightRequests();
    expect(running).toHaveLength(1000);
    // The oldest are the ones evicted.
    expect(running.some((r) => r.request_id === 'req-0')).toBe(false);
    expect(running.some((r) => r.request_id === 'req-1099')).toBe(true);
  });
});
