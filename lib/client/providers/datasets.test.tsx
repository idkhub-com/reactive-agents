import { HttpMethod } from '@server/types/http';
import type { DataPoint, Dataset } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetsProvider, datasetQueryKeys, useDatasets } from './datasets';

// Mock dependencies
vi.mock('@client/api/v1/idk/evaluations/datasets', () => ({
  createDataset: vi.fn(),
  getDatasets: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  getDatasetDataPoints: vi.fn(),
  addDataPoints: vi.fn(),
  deleteDataPoints: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Import mocked functions
import {
  addDataPoints,
  createDataset,
  deleteDataPoints,
  deleteDataset,
  getDatasetDataPoints,
  getDatasets,
  updateDataset,
} from '@client/api/v1/idk/evaluations/datasets';

const mockDatasets: Dataset[] = [
  {
    id: '1',
    agent_id: '1',
    name: 'Test Dataset 1',
    description: 'Test Description 1',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    agent_id: '2',
    name: 'Test Dataset 2',
    description: 'Test Description 2',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockDataPoints: DataPoint[] = [
  {
    id: '1',
    method: HttpMethod.POST,
    endpoint: '/test',
    request_body: { test: 'data' },
    ground_truth: { result: 'ok' },
    function_name: 'testFunction',
    is_golden: true,
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    method: HttpMethod.GET,
    endpoint: '/test2',
    request_body: { test: 'data2' },
    ground_truth: { result: 'ok2' },
    function_name: 'testFunction2',
    is_golden: false,
    metadata: {},
    created_at: new Date().toISOString(),
  },
];

function TestComponent(): React.ReactElement {
  const {
    datasets,
    isLoading,
    error,
    queryParams,
    setQueryParams,
    selectedDataset,
    setSelectedDataset,
    createDataset: createDatasetFn,
    updateDataset: updateDatasetFn,
    deleteDataset: deleteDatasetFn,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    updateError,
    deleteError,
    dataPoints,
    dataPointsLoading,
    dataPointsError,
    dataPointQueryParams,
    setDataPointQueryParams,
    addDataPoints: addDataPointsFn,
    deleteDataPoints: deleteDataPointsFn,
    isAddingDataPoints,
    isDeletingDataPoints,
    addDataPointsError,
    deleteDataPointsError,
    getDatasetById,
    refreshDatasets,
    loadDataPoints,
    refetchDataPoints,
  } = useDatasets();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error?.message ?? 'no error'}</div>
      <div data-testid="datasets-count">{datasets?.length ?? 0}</div>
      <div data-testid="selected-dataset-id">
        {selectedDataset?.id ?? 'none'}
      </div>
      <div data-testid="query-params">{JSON.stringify(queryParams)}</div>

      <div data-testid="create-loading">
        {isCreating ? 'creating' : 'not creating'}
      </div>
      <div data-testid="update-loading">
        {isUpdating ? 'updating' : 'not updating'}
      </div>
      <div data-testid="delete-loading">
        {isDeleting ? 'deleting' : 'not deleting'}
      </div>
      <div data-testid="create-error">
        {createError?.message ?? 'no create error'}
      </div>
      <div data-testid="update-error">
        {updateError?.message ?? 'no update error'}
      </div>
      <div data-testid="delete-error">
        {deleteError?.message ?? 'no delete error'}
      </div>

      <div data-testid="datapoints-count">{dataPoints?.length ?? 0}</div>
      <div data-testid="datapoints-loading">
        {dataPointsLoading ? 'loading' : 'loaded'}
      </div>
      <div data-testid="datapoints-error">
        {dataPointsError?.message ?? 'no error'}
      </div>
      <div data-testid="datapoint-query-params">
        {JSON.stringify(dataPointQueryParams)}
      </div>

      <div data-testid="adding-datapoints-loading">
        {isAddingDataPoints ? 'adding' : 'not adding'}
      </div>
      <div data-testid="deleting-datapoints-loading">
        {isDeletingDataPoints ? 'deleting' : 'not deleting'}
      </div>
      <div data-testid="add-datapoints-error">
        {addDataPointsError?.message ?? 'no add error'}
      </div>
      <div data-testid="delete-datapoints-error">
        {deleteDataPointsError?.message ?? 'no delete error'}
      </div>

      <button
        type="button"
        data-testid="set-query-params"
        onClick={() => setQueryParams({ name: 'test' })}
      >
        Set Query Params
      </button>

      <button
        type="button"
        data-testid="select-dataset"
        onClick={() => setSelectedDataset(mockDatasets[0])}
      >
        Select Dataset
      </button>

      <button
        type="button"
        data-testid="create-dataset"
        onClick={async () => {
          try {
            await createDatasetFn({
              name: 'New Dataset',
              agent_id: '1',
              description: 'New Description',
              metadata: {},
            });
          } catch (error) {
            console.error('Create failed:', error);
          }
        }}
      >
        Create Dataset
      </button>

      <button
        type="button"
        data-testid="update-dataset"
        onClick={async () => {
          try {
            await updateDatasetFn('1', { description: 'Updated Description' });
          } catch (error) {
            console.error('Update failed:', error);
          }
        }}
      >
        Update Dataset
      </button>

      <button
        type="button"
        data-testid="delete-dataset"
        onClick={async () => {
          try {
            await deleteDatasetFn('1');
          } catch (error) {
            console.error('Delete failed:', error);
          }
        }}
      >
        Delete Dataset
      </button>

      <button
        type="button"
        data-testid="get-dataset-by-id"
        onClick={() => {
          const dataset = getDatasetById('1');
          if (dataset) {
            setSelectedDataset(dataset);
          }
        }}
      >
        Get Dataset By ID
      </button>

      <button
        type="button"
        data-testid="refresh-datasets"
        onClick={refreshDatasets}
      >
        Refresh Datasets
      </button>

      <button
        type="button"
        data-testid="load-datapoints"
        onClick={() => loadDataPoints('1', { limit: 10 })}
      >
        Load Data Points
      </button>

      <button
        type="button"
        data-testid="set-datapoint-query-params"
        onClick={() => setDataPointQueryParams({ is_golden: true })}
      >
        Set DataPoint Query Params
      </button>

      <button
        type="button"
        data-testid="add-datapoints"
        onClick={async () => {
          try {
            await addDataPointsFn('1', [
              {
                method: HttpMethod.POST,
                endpoint: '/new',
                request_body: { new: 'data' },
                ground_truth: { new: 'result' },
                function_name: 'newFunction',
                is_golden: true,
                metadata: {},
              },
            ]);
          } catch (error) {
            console.error('Add data points failed:', error);
          }
        }}
      >
        Add Data Points
      </button>

      <button
        type="button"
        data-testid="delete-datapoints"
        onClick={async () => {
          try {
            await deleteDataPointsFn('1', ['1', '2']);
          } catch (error) {
            console.error('Delete data points failed:', error);
          }
        }}
      >
        Delete Data Points
      </button>

      <button
        type="button"
        data-testid="refetch-datapoints"
        onClick={refetchDataPoints}
      >
        Refetch Data Points
      </button>
    </div>
  );
}

describe('DatasetsProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Reset mocks
    vi.mocked(createDataset).mockResolvedValue({
      id: '3',
      agent_id: '1',
      name: 'New Dataset',
      description: 'New Description',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(getDatasets).mockResolvedValue(mockDatasets);
    vi.mocked(updateDataset).mockResolvedValue({
      ...mockDatasets[0],
      description: 'Updated Description',
    });
    vi.mocked(deleteDataset).mockResolvedValue();
    vi.mocked(getDatasetDataPoints).mockResolvedValue(mockDataPoints);
    vi.mocked(addDataPoints).mockResolvedValue([
      {
        id: '3',
        method: HttpMethod.POST,
        endpoint: '/new',
        request_body: { new: 'data' },
        ground_truth: { new: 'result' },
        function_name: 'newFunction',
        is_golden: true,
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(deleteDataPoints).mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides datasets data and loading states', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    // Initially loading
    expect(screen.getByTestId('loading').textContent).toBe('loading');
    expect(screen.getByTestId('datasets-count').textContent).toBe('0');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('datasets-count').textContent).toBe('2');
    expect(screen.getByTestId('error').textContent).toBe('no error');
    expect(getDatasets).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('handles dataset creation successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('create-loading').textContent).toBe(
      'not creating',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('create-dataset'));
    });

    await waitFor(() => {
      expect(createDataset).toHaveBeenCalledWith({
        name: 'New Dataset',
        agent_id: '1',
        description: 'New Description',
        metadata: {},
      });
    });
  });

  it('handles query parameter updates', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('query-params').textContent).toBe('{}');

    // Mock a second call for when params change
    vi.mocked(getDatasets).mockResolvedValueOnce(
      mockDatasets.filter((d) => d.name.includes('test')),
    );

    fireEvent.click(screen.getByTestId('set-query-params'));

    expect(screen.getByTestId('query-params').textContent).toBe(
      JSON.stringify({ name: 'test' }),
    );

    // Should trigger refetch with new params
    await waitFor(() => {
      expect(getDatasets).toHaveBeenCalledWith({
        name: 'test',
        limit: 20,
        offset: 0,
      });
    });
  });

  it('manages selected dataset state', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('none');

    fireEvent.click(screen.getByTestId('select-dataset'));

    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');
  });

  it('handles dataset updates successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('update-loading').textContent).toBe(
      'not updating',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('update-dataset'));
    });

    await waitFor(() => {
      expect(updateDataset).toHaveBeenCalledWith('1', {
        description: 'Updated Description',
      });
    });
  });

  it('handles dataset deletion successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Select a dataset first
    await act(() => {
      fireEvent.click(screen.getByTestId('select-dataset'));
    });
    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');

    expect(screen.getByTestId('delete-loading').textContent).toBe(
      'not deleting',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('delete-dataset'));
    });

    await waitFor(() => {
      expect(deleteDataset).toHaveBeenCalledWith('1');
    });

    // Selected dataset should be cleared after deletion
    await waitFor(() => {
      expect(screen.getByTestId('selected-dataset-id').textContent).toBe(
        'none',
      );
    });
  });

  it('provides getDatasetById helper function', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('none');

    fireEvent.click(screen.getByTestId('get-dataset-by-id'));

    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');
  });

  it('handles manual data points loading with loadDataPoints function', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Initially no data points loaded
    expect(screen.getByTestId('datapoints-count').textContent).toBe('0');

    // Load data points for dataset 1 manually
    fireEvent.click(screen.getByTestId('load-datapoints'));

    // Should select the dataset and set query params
    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');
    expect(screen.getByTestId('datapoint-query-params').textContent).toBe(
      JSON.stringify({ limit: 10 }),
    );

    // Wait for data points to load
    await waitFor(() => {
      expect(screen.getByTestId('datapoints-count').textContent).toBe('2');
    });

    expect(getDatasetDataPoints).toHaveBeenCalledWith('1', { limit: 10 });
  });

  it('handles data points addition successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('adding-datapoints-loading').textContent).toBe(
      'not adding',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('add-datapoints'));
    });

    await waitFor(() => {
      expect(addDataPoints).toHaveBeenCalledWith(
        '1',
        [
          {
            method: HttpMethod.POST,
            endpoint: '/new',
            request_body: { new: 'data' },
            ground_truth: { new: 'result' },
            function_name: 'newFunction',
            is_golden: true,
            metadata: {},
          },
        ],
        undefined,
      );
    });
  });

  it('handles data points deletion successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('deleting-datapoints-loading').textContent).toBe(
      'not deleting',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('delete-datapoints'));
    });

    await waitFor(() => {
      expect(deleteDataPoints).toHaveBeenCalledWith('1', ['1', '2']);
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });

    vi.mocked(getDatasets).mockRejectedValue(new Error('API Error'));

    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('API Error');
    });

    consoleError.mockRestore();
  });

  it('throws error when useDatasets is used outside provider', () => {
    function BadComponent(): React.ReactElement | null {
      useDatasets();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useDatasets must be used within a DatasetsProvider',
    );
  });

  it('separates error states correctly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });

    vi.mocked(createDataset).mockRejectedValue(new Error('Create Error'));
    vi.mocked(updateDataset).mockRejectedValue(new Error('Update Error'));
    vi.mocked(deleteDataset).mockRejectedValue(new Error('Delete Error'));
    vi.mocked(addDataPoints).mockRejectedValue(
      new Error('Add DataPoints Error'),
    );
    vi.mocked(deleteDataPoints).mockRejectedValue(
      new Error('Delete DataPoints Error'),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Test create error
    await act(() => {
      fireEvent.click(screen.getByTestId('create-dataset'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('create-error').textContent).toBe(
        'Create Error',
      );
    });

    // Test add data points error
    await act(() => {
      fireEvent.click(screen.getByTestId('add-datapoints'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('add-datapoints-error').textContent).toBe(
        'Add DataPoints Error',
      );
    });

    consoleError.mockRestore();
  });

  it('handles delete errors and clears selected dataset', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });

    // Mock delete to fail
    vi.mocked(deleteDataset).mockRejectedValue(new Error('Delete failed'));

    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Should show 2 datasets initially
    expect(screen.getByTestId('datasets-count').textContent).toBe('2');

    // Select a dataset first
    await act(() => {
      fireEvent.click(screen.getByTestId('select-dataset'));
    });
    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');

    // Attempt delete (should fail)
    await act(() => {
      fireEvent.click(screen.getByTestId('delete-dataset'));
    });

    // Selected dataset should be cleared on delete attempt
    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('none');

    // Should show delete error
    await waitFor(() => {
      expect(screen.getByTestId('delete-error').textContent).toBe(
        'Delete failed',
      );
    });

    consoleError.mockRestore();
  });

  it('automatically refetches when query parameters change', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Initial call with empty params
    expect(getDatasets).toHaveBeenCalledWith({ limit: 20, offset: 0 });

    // Clear previous calls
    vi.clearAllMocks();

    // Mock filtered results
    vi.mocked(getDatasets).mockResolvedValueOnce(
      mockDatasets.filter((d) => d.name.includes('test')),
    );

    // Change query params
    fireEvent.click(screen.getByTestId('set-query-params'));

    // Should automatically trigger new query due to queryKey change
    await waitFor(() => {
      expect(getDatasets).toHaveBeenCalledWith({
        name: 'test',
        limit: 20,
        offset: 0,
      });
    });
  });

  it('invalidates cache on successful mutations', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Test create invalidation
    await act(() => {
      fireEvent.click(screen.getByTestId('create-dataset'));
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: datasetQueryKeys.lists(),
      });
    });

    // Clear and test delete invalidation
    invalidateQueriesSpy.mockClear();

    await act(() => {
      fireEvent.click(screen.getByTestId('delete-dataset'));
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: datasetQueryKeys.lists(),
      });
    });

    invalidateQueriesSpy.mockRestore();
  });

  it('updates selected dataset when updated dataset is selected', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Select a dataset
    fireEvent.click(screen.getByTestId('select-dataset'));
    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');

    // Update the selected dataset
    await act(() => {
      fireEvent.click(screen.getByTestId('update-dataset'));
    });

    // The selected dataset should be updated with new data
    await waitFor(() => {
      expect(updateDataset).toHaveBeenCalledWith('1', {
        description: 'Updated Description',
      });
    });

    // Selected dataset should still be selected (with updated data)
    expect(screen.getByTestId('selected-dataset-id').textContent).toBe('1');
  });

  it('manages data point query parameters', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('datapoint-query-params').textContent).toBe('{}');

    fireEvent.click(screen.getByTestId('set-datapoint-query-params'));

    expect(screen.getByTestId('datapoint-query-params').textContent).toBe(
      JSON.stringify({ is_golden: true }),
    );
  });

  it('validates query keys structure', () => {
    expect(datasetQueryKeys.all).toEqual(['datasets']);
    expect(datasetQueryKeys.lists()).toEqual(['datasets', 'list']);
    expect(datasetQueryKeys.list({ name: 'test' })).toEqual([
      'datasets',
      'list',
      { name: 'test' },
    ]);
    expect(datasetQueryKeys.details()).toEqual(['datasets', 'detail']);
    expect(datasetQueryKeys.detail('123')).toEqual([
      'datasets',
      'detail',
      '123',
    ]);
    expect(datasetQueryKeys.dataPoints('123')).toEqual([
      'datasets',
      'detail',
      '123',
      'dataPoints',
    ]);
    expect(datasetQueryKeys.dataPointsList('123', { limit: 10 })).toEqual([
      'datasets',
      'detail',
      '123',
      'dataPoints',
      { limit: 10 },
    ]);
  });

  it('only fetches data points when manually requested', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatasetsProvider>
          <TestComponent />
        </DatasetsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Initially no dataset selected, so no data points should be fetched
    expect(getDatasetDataPoints).not.toHaveBeenCalled();
    expect(screen.getByTestId('datapoints-count').textContent).toBe('0');

    // Select a dataset - data points should still not be fetched automatically
    fireEvent.click(screen.getByTestId('select-dataset'));

    // Data points should still not be fetched automatically
    expect(getDatasetDataPoints).not.toHaveBeenCalled();
    expect(screen.getByTestId('datapoints-count').textContent).toBe('0');

    // Only when we manually load data points should they be fetched
    fireEvent.click(screen.getByTestId('load-datapoints'));

    await waitFor(() => {
      expect(getDatasetDataPoints).toHaveBeenCalledWith('1', { limit: 10 });
      expect(screen.getByTestId('datapoints-count').textContent).toBe('2');
    });
  });
});
