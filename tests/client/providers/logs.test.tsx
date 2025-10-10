import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies - must be before other imports
vi.mock('@client/api/v1/idk/observability/logs', () => ({
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

vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn().mockResolvedValue([]),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@shared/types/data/log', () => ({
  LogsQueryParams: { parse: () => ({}) },
}));

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/agents',
  useParams: () => ({}),
}));

// Mock the providers that LogsProvider depends on
vi.mock('@client/providers/agents', () => ({
  useAgents: () => ({
    selectedAgent: { id: 'test-agent', name: 'Test Agent' },
  }),
}));

vi.mock('@client/providers/navigation', () => ({
  useNavigation: () => ({
    navigationState: {
      selectedAgent: { id: 'test-agent', name: 'Test Agent' },
      selectedSkill: { id: 'test-skill', name: 'Test Skill' },
    },
  }),
}));

// Now import everything
import { LogsProvider, useLogs } from '@client/providers/logs';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type React from 'react';

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
  const {
    logs,
    selectedLog,
    setSelectedLog,
    modifiedValue,
    setModifiedValue,
    saveModifiedValue,
  } = useLogs();
  return (
    <div>
      <div data-testid="logs-length">{logs.length}</div>
      <div data-testid="selected-log">{selectedLog?.id ?? ''}</div>
      <button
        type="button"
        data-testid="select-button"
        onClick={(): void =>
          setSelectedLog({
            id: '1',
            ai_provider_request_log: {
              response_body: {
                choices: [
                  {
                    message: {
                      role: ChatCompletionMessageRole.USER,
                      content: 'foo',
                    },
                    index: 0,
                    finish_reason: 'stop',
                  },
                ],
              },
            },
          } as unknown as IdkRequestLog)
        }
      >
        Select
      </button>
      <input
        data-testid="input"
        value={modifiedValue}
        onChange={(e): void => setModifiedValue(e.target.value)}
      />
      <button
        type="button"
        data-testid="save-button"
        onClick={(): void => saveModifiedValue()}
      >
        Save
      </button>
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
  });

  it('provides logs from queryLogs', async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
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

  it('can select a log and update modifiedValue', async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
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

    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
      screen.getByTestId('select-button').click();
    });

    expect(screen.getByTestId('selected-log').textContent).toBe('1');

    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'bar' } });
    });

    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('bar');
  });

  it('saveModifiedValue updates localStorage', async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
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

    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
      screen.getByTestId('select-button').click();
    });

    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'baz' } });
    });

    await act(async (): Promise<void> => {
      await Promise.resolve(); // Add an await expression
      screen.getByTestId('save-button').click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      '1',
      expect.stringContaining('baz'),
    );
  });

  it('throws if useLogs is used outside provider', (): void => {
    function BadComponent(): React.ReactElement | null {
      useLogs();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow();
  });
});
