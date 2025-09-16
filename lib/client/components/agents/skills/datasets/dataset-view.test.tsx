import * as datasetsApi from '@client/api/v1/idk/evaluations/datasets';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { Dataset, Log } from '@shared/types/data';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetView } from './dataset-view';

// Mock the API functions
vi.mock('@client/api/v1/idk/evaluations/datasets');

// Mock the providers
const mockUseDatasets = {
  datasets: [] as Dataset[],
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  isLoading: false,
  refetch: vi.fn(),
  selectedDataset: null,
  setSelectedDataset: vi.fn(),
};

const mockUseLogs = {
  logs: [],
  isLoading: false,
  error: null,
};

vi.mock('@client/providers/datasets', () => ({
  DatasetsProvider: ({ children }: { children: React.ReactNode }) => children,
  useDatasets: () => mockUseDatasets,
}));

vi.mock('@client/providers/logs', () => ({
  LogsProvider: ({ children }: { children: React.ReactNode }) => children,
  useLogs: () => mockUseLogs,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock the LogsList component
vi.mock('@client/components/datasets-view/components/logs-list', () => ({
  LogsList: ({ logs }: { logs: Log[] }) => (
    <div data-testid="logs-list">
      {logs.map((log) => (
        <div key={log.id}>{log.function_name}</div>
      ))}
    </div>
  ),
}));

// Mock the AddLogsDialog component
vi.mock('@client/components/datasets-view/components/add-logs-dialog', () => ({
  AddLogsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-logs-dialog">Add Logs Dialog</div> : null,
}));

const mockDataset: Dataset = {
  id: 'test-dataset-id',
  agent_id: '1',
  name: 'Test Dataset',
  description: 'A test dataset for testing',
  is_realtime: false,
  realtime_size: 1,
  metadata: {},
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
};

const mockLogs: Log[] = [
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
    metadata: { log_id: 'log-1' },
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

const renderDatasetView = (datasetId: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DatasetView datasetId={datasetId} />
    </QueryClientProvider>,
  );
};

describe('DatasetView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDatasets.datasets = [mockDataset];
    mockUseDatasets.selectedDataset = null;
    mockUseDatasets.isLoading = false;
    vi.mocked(datasetsApi.getDatasetLogs).mockResolvedValue(mockLogs);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when datasets are loading', () => {
    mockUseDatasets.datasets = [];
    mockUseDatasets.isLoading = true;

    const { container } = renderDatasetView('test-dataset-id');

    // Check for skeleton elements
    const skeletons = container.querySelectorAll('.h-32, .h-96');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders dataset not found when dataset does not exist', async () => {
    mockUseDatasets.datasets = [];
    mockUseDatasets.isLoading = false;

    renderDatasetView('non-existent-id');

    await waitFor(() => {
      expect(screen.getByText('Dataset not found')).toBeInTheDocument();
    });
  });

  it('renders dataset details when dataset exists', async () => {
    renderDatasetView('test-dataset-id');

    await waitFor(() => {
      expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      expect(
        screen.getByText('A test dataset for testing'),
      ).toBeInTheDocument();
    });
  });

  it('sets selected dataset when component mounts', async () => {
    renderDatasetView('test-dataset-id');

    await waitFor(() => {
      expect(mockUseDatasets.setSelectedDataset).toHaveBeenCalledWith(
        mockDataset,
      );
    });
  });

  it('loads logs when component mounts', async () => {
    renderDatasetView('test-dataset-id');

    await waitFor(() => {
      expect(datasetsApi.getDatasetLogs).toHaveBeenCalledWith(
        'test-dataset-id',
        { limit: 50, offset: 0 },
      );
    });
  });

  describe('Edit functionality', () => {
    it('enters edit mode when edit button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Dataset')).toBeInTheDocument();
      });
    });

    it('cancels edit mode when cancel button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Dataset')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
        expect(
          screen.queryByDisplayValue('Test Dataset'),
        ).not.toBeInTheDocument();
      });
    });

    it('saves changes when save button is clicked', async () => {
      const user = userEvent.setup();
      mockUseDatasets.updateDataset.mockResolvedValue(undefined);

      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Dataset')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Dataset');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Dataset Name');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Add debugging to see what calls were made
      await waitFor(
        () => {
          // First check if the function was called at all
          expect(mockUseDatasets.updateDataset).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      // Then check the specific call
      expect(mockUseDatasets.updateDataset).toHaveBeenCalledWith(
        'test-dataset-id',
        {
          name: 'Updated Dataset Name',
          description: 'A test dataset for testing',
          realtime_size: 1,
        },
      );
    });
  });

  describe('Delete functionality', () => {
    it('opens delete dialog when delete button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete "Test Dataset"/),
        ).toBeInTheDocument();
      });
    });

    it('deletes dataset when confirm is clicked', async () => {
      mockUseDatasets.deleteDataset.mockResolvedValue(undefined);

      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete "Test Dataset"/),
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: 'Delete Dataset',
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUseDatasets.deleteDataset).toHaveBeenCalledWith(
          'test-dataset-id',
        );
      });
    });
  });

  describe('Search functionality', () => {
    it('filters logs based on search query', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No logs found')).toBeInTheDocument();
      });
    });

    it('resets search when reset button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(searchInput).toHaveValue('test search');

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Add Logs functionality', () => {
    it('opens add logs dialog when button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', {
        name: /add logs/i,
      });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-logs-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Back navigation', () => {
    it('navigates back when back button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockUseDatasets.setSelectedDataset).toHaveBeenCalledWith(null);
    });
  });
});
