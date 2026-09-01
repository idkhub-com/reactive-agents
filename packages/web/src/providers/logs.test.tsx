import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies - must be before other imports
vi.mock('@web/api/v1/super-agents/observability/logs', () => ({
  queryLogs: vi.fn().mockResolvedValue([
    {
      id: '1',
      ai_provider_request_log: {
        response_body: {
          choices: [
            {
              message: { role: 'user', content: 'foo' },
              index: 0,
              finish_reason: 'stop',
            },
          ],
        },
      },
    },
  ]),
}));

vi.mock('@web/api/v1/super-agents/agents', () => ({
  getAgents: vi.fn().mockResolvedValue([]),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}));

vi.mock('@web/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@shared/types/data/log', () => ({
  // Pass params through so the tests can see what scope was queried
  LogsQueryParams: { parse: (params: unknown) => params },
}));

// Mock TanStack Router navigation hooks
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: vi.fn(),
    history: {
      back: vi.fn(),
      forward: vi.fn(),
    },
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/agents' }),
  useParams: () => ({}),
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  Link: ({ children, to }: { children: any; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock the providers that LogsProvider depends on
vi.mock('@web/providers/agents', () => ({
  useAgents: () => ({
    selectedAgent: { id: 'test-agent', name: 'Test Agent' },
  }),
}));

const mockNavigationState: Record<string, unknown> = {
  selectedAgent: { id: 'test-agent', name: 'Test Agent' },
  selectedSkill: { id: 'test-skill', name: 'Test Skill' },
};

vi.mock('@web/providers/navigation', () => ({
  useNavigation: () => ({
    navigationState: mockNavigationState,
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { queryLogs } from '@web/api/v1/super-agents/observability/logs';
// Now import everything
import { LogsProvider, useLogs } from '@web/providers/logs';
import React from 'react';

// Create a mock for localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] || null),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key];
    }),
    clear: vi.fn((): void => {
      store = {};
    }),
  };
})();

function TestComponent(): React.ReactElement {
  const { logs, selectedLog, setAgentId, setSkillId } = useLogs();

  // Set agentId and skillId on mount to trigger log fetching
  React.useEffect(() => {
    setAgentId('test-agent');
    setSkillId('test-skill');
  }, [setAgentId, setSkillId]);

  return (
    <div>
      <div data-testid="logs-length">{logs.length}</div>
      <div data-testid="selected-log">{selectedLog?.id ?? ''}</div>
    </div>
  );
}

describe('LogsProvider', (): void => {
  let queryClient: QueryClient;

  // Set up the localStorage mock before each test
  beforeEach((): void => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  // Clear mock calls after each test
  afterEach((): void => {
    vi.clearAllMocks();
    delete mockNavigationState.logId;
  });

  it('provides logs from queryLogs', async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await Promise.resolve();
      render(
        <QueryClientProvider client={queryClient}>
          <LogsProvider>
            <TestComponent />
          </LogsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('logs-length').textContent).toBe('1');
    });
  });

  it('fetches agent-wide logs without a skill filter', async (): Promise<void> => {
    // The agent-level logs page has no skill: it turns on agentWide and the
    // query must go out with only the agent id, not wait for a skill id.
    function AgentWideComponent(): React.ReactElement {
      const { logs, setAgentId, setAgentWide } = useLogs();

      React.useEffect(() => {
        setAgentId('test-agent');
        setAgentWide(true);
      }, [setAgentId, setAgentWide]);

      return <div data-testid="logs-length">{logs.length}</div>;
    }

    await act(async (): Promise<void> => {
      await Promise.resolve();
      render(
        <QueryClientProvider client={queryClient}>
          <LogsProvider>
            <AgentWideComponent />
          </LogsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('logs-length').textContent).toBe('1');
    });

    const listCall = vi
      .mocked(queryLogs)
      .mock.calls.find(([params]) => !('id' in (params as object)));
    expect(listCall?.[0]).toMatchObject({ agent_id: 'test-agent' });
    expect(listCall?.[0]).not.toHaveProperty('skill_id');
  });

  it('fetches a log by id when it is not in the current page', async (): Promise<void> => {
    // A deep link, or a row clicked on a later page of the agent-wide view,
    // names a log the one-page list does not hold.
    mockNavigationState.logId = 'log-9';
    vi.mocked(queryLogs).mockImplementation((params) => {
      if ((params as { id?: string }).id === 'log-9') {
        return Promise.resolve([{ id: 'log-9' }] as Awaited<
          ReturnType<typeof queryLogs>
        >);
      }
      return Promise.resolve([{ id: '1' }] as Awaited<
        ReturnType<typeof queryLogs>
      >);
    });

    await act(async (): Promise<void> => {
      await Promise.resolve();
      render(
        <QueryClientProvider client={queryClient}>
          <LogsProvider>
            <TestComponent />
          </LogsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected-log').textContent).toBe('log-9');
    });
  });

  it('throws if useLogs is used outside provider', (): void => {
    function BadComponent(): React.ReactElement | null {
      useLogs();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow();
  });
});
