import { act, render, screen } from '@testing-library/react';
import { LogsTableView } from '@web/components/agents/logs-table-view';
import type { PendingRequest } from '@web/providers/in-flight-requests';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The logs table, seen from the angle of requests that have not finished.
 *
 * A log row is only written once its request is done, so a slow request used
 * to look like nothing at all. These cover the pending rows that stand in for
 * one while it runs, and the counter that shows it is still going.
 */

const logsState = vi.hoisted(() => ({
  value: {
    logs: [] as unknown[],
    isLoading: false,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    agentId: 'agent-1' as string | null,
    skillId: null as string | null,
    agentWide: true,
  },
}));

const pending = vi.hoisted(() => ({ value: [] as PendingRequest[] }));

vi.mock('@web/providers/logs', () => ({
  useLogs: () => logsState.value,
}));

vi.mock('@web/providers/in-flight-requests', () => ({
  useInFlightRequests: () => ({
    pendingRequests: pending.value,
    // Measured the way the provider measures it, from `performance.now()`.
    elapsedMs: (request: PendingRequest) =>
      request.elapsed_ms + (performance.now() - request.received_at),
  }),
}));

const aPendingRequest = (
  overrides: Partial<PendingRequest> = {},
): PendingRequest => ({
  request_id: 'req-1',
  agent_id: 'agent-1',
  skill_id: 'skill-1',
  method: 'POST',
  endpoint: '/v1/chat/completions',
  function_name: 'chatComplete',
  model: 'gpt-5.6',
  elapsed_ms: 0,
  received_at: performance.now(),
  ...overrides,
});

const renderTable = () =>
  render(
    <LogsTableView
      description="Logs"
      emptyText="No logs yet"
      onBack={vi.fn()}
      onLogClick={vi.fn()}
      extraColumn={{ header: 'Skill', render: () => 'skill' }}
    />,
  );

describe('LogsTableView pending rows', () => {
  beforeEach(() => {
    pending.value = [];
    logsState.value = { ...logsState.value, page: 1, logs: [] };
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a running request instead of the empty state', () => {
    pending.value = [aPendingRequest()];

    renderTable();

    expect(screen.getByTestId('pending-log-row')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('/v1/chat/completions')).toBeInTheDocument();
    expect(screen.queryByText('No logs found')).not.toBeInTheDocument();
  });

  it('counts the duration up while the request runs', () => {
    pending.value = [aPendingRequest({ elapsed_ms: 1000 })];

    renderTable();

    expect(screen.getByText('1.0s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('3.0s')).toBeInTheDocument();
  });

  it('says how many requests are running', () => {
    pending.value = [
      aPendingRequest(),
      aPendingRequest({ request_id: 'req-2' }),
    ];

    renderTable();

    expect(screen.getByText(/2 running/)).toBeInTheDocument();
  });

  it('keeps pending rows off later pages, where they do not belong', () => {
    pending.value = [aPendingRequest()];
    logsState.value = { ...logsState.value, page: 2 };

    renderTable();

    expect(screen.queryByTestId('pending-log-row')).not.toBeInTheDocument();
  });
});
