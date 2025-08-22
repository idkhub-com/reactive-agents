import * as datasetsApi from '@client/api/v1/idk/evaluations/datasets';
import { DatasetView } from '@client/components/datasets-view/dataset-view';
import { HttpMethod } from '@server/types/http';
import type { DataPoint, Dataset } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Mock the DataPointsList component
vi.mock('@client/components/datasets/components/data-points-list', () => ({
  DataPointsList: ({ dataPoints }: { dataPoints: DataPoint[] }) => (
    <div data-testid="data-points-list">
      {dataPoints.map((dp) => (
        <div key={dp.id}>{dp.function_name}</div>
      ))}
    </div>
  ),
}));

// Mock the AddDataPointsDialog component
vi.mock(
  '@client/components/datasets-view/components/add-data-points-dialog',
  () => ({
    AddDataPointsDialog: ({ open }: { open: boolean }) =>
      open ? (
        <div data-testid="add-data-points-dialog">Add Data Points Dialog</div>
      ) : null,
  }),
);

const mockDataset: Dataset = {
  id: 'test-dataset-id',
  agent_id: '1',
  name: 'Test Dataset',
  description: 'A test dataset for testing',
  metadata: {},
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
};

const mockDataPoints: DataPoint[] = [
  {
    id: 'dp-1',
    method: HttpMethod.POST,
    endpoint: '/api/test',
    function_name: 'test_function',
    request_body: { test: 'data' },
    ground_truth: {
      status: 200,
      response_body: { result: 'success' },
      duration: 100,
    },
    is_golden: false,
    metadata: { log_id: 'log-1' },
    created_at: '2023-01-01T00:00:00Z',
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
    vi.mocked(datasetsApi.getDatasetDataPoints).mockResolvedValue(
      mockDataPoints,
    );
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

  it('loads data points when component mounts', async () => {
    renderDatasetView('test-dataset-id');

    await waitFor(() => {
      expect(datasetsApi.getDatasetDataPoints).toHaveBeenCalledWith(
        'test-dataset-id',
        {},
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
      mockUseDatasets.updateDataset.mockResolvedValue(undefined);

      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Dataset')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Dataset');
      fireEvent.change(nameInput, {
        target: { value: 'Updated Dataset Name' },
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseDatasets.updateDataset).toHaveBeenCalledWith(
          'test-dataset-id',
          {
            name: 'Updated Dataset Name',
            description: 'A test dataset for testing',
          },
        );
      });
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
    it('filters data points based on search query', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search data points...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No data points found')).toBeInTheDocument();
      });
    });

    it('resets search when reset button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search data points...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(searchInput).toHaveValue('test search');

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Add Data Points functionality', () => {
    it('opens add data points dialog when button is clicked', async () => {
      renderDatasetView('test-dataset-id');

      await waitFor(() => {
        expect(screen.getByText('Test Dataset')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', {
        name: /add data points/i,
      });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByTestId('add-data-points-dialog'),
        ).toBeInTheDocument();
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
