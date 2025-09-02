import { AddLogsDialog } from '@client/components/datasets-view/components/add-logs-dialog';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { Log } from '@shared/types/data';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the providers
const mockUseDatasets = {
  addLogs: vi.fn(),
};

const mockUseLogs = {
  logs: [] as IdkRequestLog[],
  isLoading: false,
  error: null as Error | null,
};

// Mock the Skeleton component to avoid loading issues
vi.mock('@client/components/ui/skeleton', () => ({
  Skeleton: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => (
    <div data-testid="skeleton" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@client/providers/datasets', () => ({
  useDatasets: () => mockUseDatasets,
}));

vi.mock('@client/providers/logs', () => ({
  useLogs: () => mockUseLogs,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockLogs: IdkRequestLog[] = [
  {
    id: 'log-1',
    agent_id: 'agent-1',
    skill_id: 'skill-1',
    method: HttpMethod.POST,
    endpoint: '/api/test',
    function_name: FunctionName.CHAT_COMPLETE,
    status: 200,
    duration: 100,
    start_time: Date.now() - 1000000,
    end_time: Date.now() - 900000,
    ai_provider: AIProvider.OPENAI,
    model: 'gpt-4',
    base_idk_config: {},
    ai_provider_request_log: {
      provider: AIProvider.OPENAI,
      function_name: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      request_url: '/api/test',
      status: 200,
      request_body: { test: 'data' },
      response_body: { result: 'success' },
      raw_request_body: '{"test":"data"}',
      raw_response_body: '{"result":"success"}',
      cache_mode: CacheMode.SIMPLE,
      cache_status: CacheStatus.MISS,
    },
    hook_logs: [],
    metadata: {},
    cache_status: CacheStatus.MISS,
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  },
  {
    id: 'log-2',
    agent_id: 'agent-1',
    skill_id: 'skill-1',
    method: HttpMethod.GET,
    endpoint: '/api/users',
    function_name: FunctionName.RETRIEVE_FILE,
    status: 404,
    duration: 50,
    start_time: Date.now() - 800000,
    end_time: Date.now() - 750000,
    ai_provider: AIProvider.ANTHROPIC,
    model: 'claude-3',
    base_idk_config: {},
    ai_provider_request_log: {
      provider: AIProvider.ANTHROPIC,
      function_name: FunctionName.RETRIEVE_FILE,
      method: HttpMethod.GET,
      request_url: '/api/users',
      status: 404,
      request_body: {},
      response_body: { error: 'Not found' },
      raw_request_body: '{}',
      raw_response_body: '{"error":"Not found"}',
      cache_mode: CacheMode.SIMPLE,
      cache_status: CacheStatus.MISS,
    },
    hook_logs: [],
    metadata: {},
    cache_status: CacheStatus.MISS,
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  },
];

const existingLogs: Log[] = [
  {
    id: 'log-1',
    agent_id: 'agent-1',
    skill_id: 'skill-1',
    method: HttpMethod.POST,
    endpoint: '/api/test',
    function_name: FunctionName.CHAT_COMPLETE,
    status: 200,
    start_time: Date.now() - 1000000,
    end_time: Date.now() - 900000,
    duration: 100,
    base_idk_config: {},
    ai_provider: AIProvider.OPENAI,
    model: 'gpt-4',
    ai_provider_request_log: {
      provider: AIProvider.OPENAI,
      function_name: FunctionName.CHAT_COMPLETE,
      request_url: '/api/test',
      method: HttpMethod.POST,
      status: 200,
      request_body: { test: 'data' },
      response_body: { result: 'success' },
      raw_request_body: JSON.stringify({ test: 'data' }),
      raw_response_body: JSON.stringify({ result: 'success' }),
      cache_mode: CacheMode.SIMPLE,
      cache_status: CacheStatus.MISS,
    },
    hook_logs: [],
    metadata: {},
    cache_status: CacheStatus.MISS,
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  },
];

const renderAddLogsDialog = (
  props: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    datasetId?: string;
    existingLogs?: Log[];
  } = {},
) => {
  const {
    open = true,
    onOpenChange = vi.fn(),
    datasetId = 'test-dataset-id',
    existingLogs: existing = [],
  } = props;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AddLogsDialog
        open={open}
        onOpenChange={onOpenChange}
        datasetId={datasetId}
        existingLogs={existing}
      />
    </QueryClientProvider>,
  );
};

describe('AddLogsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock logs data before each test
    mockUseLogs.logs = [...mockLogs];
    mockUseLogs.isLoading = false;
    mockUseLogs.error = null;
    // Reset mock functions
    mockUseDatasets.addLogs.mockReset();
    mockToast.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders dialog when open is true', () => {
      renderAddLogsDialog({ open: true });

      expect(screen.getByText('Add Logs')).toBeInTheDocument();
      expect(
        screen.getByText(/Select logs to convert into logs for this dataset/),
      ).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      renderAddLogsDialog({ open: false });

      expect(screen.queryByText('Add Logs')).not.toBeInTheDocument();
    });

    it('shows error state when logs fail to load', () => {
      mockUseLogs.error = new Error('Failed to load logs');
      mockUseLogs.logs = [];

      renderAddLogsDialog();

      expect(screen.getByText('Error loading logs')).toBeInTheDocument();
    });
  });

  describe('Log filtering', () => {
    it('filters out logs that are already in the dataset', async () => {
      renderAddLogsDialog({ existingLogs });

      // Wait for the component to render
      await waitFor(() => {
        // Should only show log-2 (retrieve_file), not log-1 (chat_complete) which is already in the dataset
        const functionText = screen.queryAllByText('Function: retrieve_file');
        expect(functionText.length).toBeGreaterThan(0);
      });

      // Should not find chat_complete since it's filtered out
      expect(
        screen.queryByText('Function: chat_complete'),
      ).not.toBeInTheDocument();
    });

    it('shows all logs when no existing logs', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      await waitFor(() => {
        expect(screen.getByText('Function: chat_complete')).toBeInTheDocument();
        expect(screen.getByText('Function: retrieve_file')).toBeInTheDocument();
      });
    });

    it('shows empty state when no logs available', () => {
      mockUseLogs.logs = [];

      renderAddLogsDialog();

      expect(screen.getByText('No logs found')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('filters logs based on search query', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      // Both logs should be visible initially
      await waitFor(() => {
        expect(screen.getByText('Function: chat_complete')).toBeInTheDocument();
        expect(screen.getByText('Function: retrieve_file')).toBeInTheDocument();
      });

      // Search for "retrieve"
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'retrieve' } });

      await waitFor(() => {
        expect(screen.getByText('Function: retrieve_file')).toBeInTheDocument();
        expect(
          screen.queryByText('Function: chat_complete'),
        ).not.toBeInTheDocument();
      });
    });

    it('shows empty state when search has no results', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No logs found')).toBeInTheDocument();
        expect(
          screen.getByText('Try adjusting your search criteria'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Advanced filtering', () => {
    it('shows advanced filters when toggle is clicked', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      const filtersToggle = screen.getByRole('button', {
        name: /advanced filters/i,
      });
      fireEvent.click(filtersToggle);

      await waitFor(() => {
        expect(screen.getByText('HTTP Methods')).toBeInTheDocument();
        expect(screen.getByText('Status Codes')).toBeInTheDocument();
        expect(screen.getByText('Endpoint Contains')).toBeInTheDocument();
      });
    });

    it('filters by HTTP method', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      // Open advanced filters
      const filtersToggle = screen.getByRole('button', {
        name: /advanced filters/i,
      });
      fireEvent.click(filtersToggle);

      await waitFor(() => {
        expect(screen.getByText('HTTP Methods')).toBeInTheDocument();
      });

      // Select POST method
      const postButton = screen.getByRole('button', { name: 'POST' });
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(screen.getByText('Function: chat_complete')).toBeInTheDocument();
        expect(
          screen.queryByText('Function: retrieve_file'),
        ).not.toBeInTheDocument();
      });
    });

    it('filters by endpoint', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      // Open advanced filters
      const filtersToggle = screen.getByRole('button', {
        name: /advanced filters/i,
      });
      fireEvent.click(filtersToggle);

      // Enter endpoint filter
      const endpointInput = screen.getByPlaceholderText('e.g., /api/users');
      fireEvent.change(endpointInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Function: chat_complete')).toBeInTheDocument();
        expect(
          screen.queryByText('Function: retrieve_file'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Log selection', () => {
    it('allows selecting individual logs', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      await waitFor(() => {
        expect(screen.getByText('Function: chat_complete')).toBeInTheDocument();
      });

      // Find and click the card containing chat_complete
      const chatCompleteText = screen.getByText('Function: chat_complete');
      const card = chatCompleteText.closest('[role="button"], .cursor-pointer');

      if (card) {
        fireEvent.click(card);

        await waitFor(() => {
          expect(screen.getByText('1 log selected')).toBeInTheDocument();
          expect(screen.getByText('Will create 1 log')).toBeInTheDocument();
        });
      }
    });

    it('supports select all functionality', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      const selectAllButton = screen.getByRole('button', {
        name: /select all/i,
      });
      fireEvent.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByText('2 logs selected')).toBeInTheDocument();
        expect(screen.getByText('Will create 2 logs')).toBeInTheDocument();
      });
    });
  });

  describe('Reset functionality', () => {
    it('resets search and selection when reset button is clicked', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      // First select all logs (without any search filter)
      const selectAllButton = screen.getByRole('button', {
        name: /select all/i,
      });
      fireEvent.click(selectAllButton);

      // Wait for selection to take effect
      await waitFor(() => {
        expect(screen.getByText('2 logs selected')).toBeInTheDocument();
      });

      // Add search query
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for debounced search to take effect and verify the state
      await waitFor(
        () => {
          expect(searchInput).toHaveValue('test');
          // After filtering, we should still see selection status
          expect(screen.getByText(/log[s]? selected/)).toBeInTheDocument();
        },
        { timeout: 500 }, // Account for debounce delay
      );

      // Reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(
        () => {
          expect(searchInput).toHaveValue('');
          expect(
            screen.queryByText(/log[s]? selected/),
          ).not.toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });

  describe('Adding logs', () => {
    it('disables add button when no logs are selected', () => {
      renderAddLogsDialog({ existingLogs: [] });

      const addButton = screen.getByRole('button', {
        name: /add 0 logs/i,
      });
      expect(addButton).toBeDisabled();
    });

    it('enables add button when logs are selected', async () => {
      renderAddLogsDialog({ existingLogs: [] });

      const selectAllButton = screen.getByRole('button', {
        name: /select all/i,
      });
      fireEvent.click(selectAllButton);

      await waitFor(() => {
        const addButton = screen.getByRole('button', {
          name: /add 2 logs/i,
        });
        expect(addButton).toBeEnabled();
      });
    });

    it('calls addLogs when add button is clicked', async () => {
      const mockOnOpenChange = vi.fn();
      mockUseDatasets.addLogs.mockResolvedValue([]);

      renderAddLogsDialog({
        existingLogs: [],
        onOpenChange: mockOnOpenChange,
      });

      // Select all logs
      const selectAllButton = screen.getByRole('button', {
        name: /select all/i,
      });
      fireEvent.click(selectAllButton);

      // Click add
      const addButton = screen.getByRole('button', {
        name: /add 2 logs/i,
      });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockUseDatasets.addLogs).toHaveBeenCalledWith(
          'test-dataset-id',
          ['log-1', 'log-2'],
          {
            signal: expect.any(AbortSignal),
          },
        );
      });
    });

    it('shows success toast and closes dialog on successful add', async () => {
      const mockOnOpenChange = vi.fn();
      mockUseDatasets.addLogs.mockResolvedValue([]);

      renderAddLogsDialog({
        existingLogs: [],
        onOpenChange: mockOnOpenChange,
      });

      // Select all logs
      const selectAllButton = screen.getByRole('button', {
        name: /select all/i,
      });
      fireEvent.click(selectAllButton);

      // Click add
      const addButton = screen.getByRole('button', {
        name: /add 2 logs/i,
      });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Logs added',
          description: 'Successfully added 2 logs to the dataset',
        });
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows error toast on failed add', async () => {
      const addError = new Error('Failed to add logs');
      mockUseDatasets.addLogs.mockRejectedValue(addError);

      renderAddLogsDialog({ existingLogs: [] });

      // Select all logs
      const selectAllButton = screen.getByRole('button', {
        name: /select all/i,
      });
      fireEvent.click(selectAllButton);

      // Click add
      const addButton = screen.getByRole('button', {
        name: /add 2 logs/i,
      });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Error adding logs',
          description: 'Please try again later',
        });
      });
    });
  });

  describe('Dialog state management', () => {
    it('calls onOpenChange when cancel button is clicked', () => {
      const mockOnOpenChange = vi.fn();

      renderAddLogsDialog({ onOpenChange: mockOnOpenChange });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
