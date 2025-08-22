import type { DataPointOutput } from '@shared/types/data/data-point-output';
import type {
  EvaluationRun,
  EvaluationRunQueryParams,
} from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EvaluationRunsProvider,
  evaluationRunQueryKeys,
  useEvaluationRuns,
} from './evaluation-runs';

// Mock dependencies
vi.mock('@client/api/v1/idk/evaluations/runs', () => ({
  createEvaluationRun: vi.fn(),
  queryEvaluationRuns: vi.fn(),
  updateEvaluationRun: vi.fn(),
  deleteEvaluationRun: vi.fn(),
  getDataPointOutputs: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Import mocked functions
import {
  createEvaluationRun,
  deleteEvaluationRun,
  getDataPointOutputs,
  queryEvaluationRuns,
  updateEvaluationRun,
} from '@client/api/v1/idk/evaluations/runs';

const mockEvaluationRuns: EvaluationRun[] = [
  {
    id: '1',
    dataset_id: 'dataset-1',
    agent_id: 'agent-1',
    evaluation_method: EvaluationMethodName.TASK_COMPLETION,
    name: 'Test Run 1',
    description: 'Test Description 1',
    status: EvaluationRunStatus.COMPLETED,
    results: { accuracy: 0.95 },
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  },
  {
    id: '2',
    dataset_id: 'dataset-2',
    agent_id: 'agent-2',
    evaluation_method: EvaluationMethodName.TASK_COMPLETION,
    name: 'Test Run 2',
    description: 'Test Description 2',
    status: EvaluationRunStatus.RUNNING,
    results: {},
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: null,
  },
];

const mockDataPointOutputs: DataPointOutput[] = [
  {
    id: '1',
    data_point_id: 'dp-1',
    output: { response: 'Test output 1' },
    score: 0.9,
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    data_point_id: 'dp-2',
    output: { response: 'Test output 2' },
    score: 0.85,
    metadata: {},
    created_at: new Date().toISOString(),
  },
];

interface TestComponentProps {
  initialQueryParams?: EvaluationRunQueryParams;
}

function TestComponent({
  initialQueryParams,
}: TestComponentProps): React.ReactElement {
  const {
    evaluationRuns,
    isLoading,
    error,
    queryParams,
    setQueryParams,
    selectedEvaluationRun,
    setSelectedEvaluationRun,
    createEvaluationRun: createEvaluationRunFn,
    updateEvaluationRun: updateEvaluationRunFn,
    deleteEvaluationRun: deleteEvaluationRunFn,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    updateError,
    deleteError,
    dataPointOutputs,
    dataPointOutputsLoading,
    dataPointOutputsError,
    dataPointOutputQueryParams,
    setDataPointOutputQueryParams,
    getEvaluationRunById,
    refreshEvaluationRuns,
    loadDataPointOutputs,
    refetchDataPointOutputs,
  } = useEvaluationRuns();

  // Set initial query params if provided
  React.useEffect(() => {
    if (initialQueryParams) {
      setQueryParams(initialQueryParams);
    }
  }, [initialQueryParams, setQueryParams]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error?.message ?? 'no error'}</div>
      <div data-testid="runs-count">{evaluationRuns?.length ?? 0}</div>
      <div data-testid="selected-run-id">
        {selectedEvaluationRun?.id ?? 'none'}
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

      <div data-testid="outputs-count">{dataPointOutputs?.length ?? 0}</div>
      <div data-testid="outputs-loading">
        {dataPointOutputsLoading ? 'loading' : 'loaded'}
      </div>
      <div data-testid="outputs-error">
        {dataPointOutputsError?.message ?? 'no error'}
      </div>
      <div data-testid="output-query-params">
        {JSON.stringify(dataPointOutputQueryParams)}
      </div>

      <button
        type="button"
        data-testid="set-query-params"
        onClick={() =>
          setQueryParams({ dataset_id: 'dataset-1', agent_id: 'agent-1' })
        }
      >
        Set Query Params
      </button>

      <button
        type="button"
        data-testid="select-run"
        onClick={() => setSelectedEvaluationRun(mockEvaluationRuns[0])}
      >
        Select Run
      </button>

      <button
        type="button"
        data-testid="create-run"
        onClick={async () => {
          try {
            await createEvaluationRunFn({
              dataset_id: 'dataset-3',
              agent_id: 'agent-3',
              evaluation_method: EvaluationMethodName.TASK_COMPLETION,
              name: 'New Run',
              description: 'New Description',
              metadata: {},
            });
          } catch (error) {
            console.error('Create failed:', error);
          }
        }}
      >
        Create Run
      </button>

      <button
        type="button"
        data-testid="update-run"
        onClick={async () => {
          try {
            await updateEvaluationRunFn('1', {
              description: 'Updated Description',
            });
          } catch (error) {
            console.error('Update failed:', error);
          }
        }}
      >
        Update Run
      </button>

      <button
        type="button"
        data-testid="delete-run"
        onClick={async () => {
          try {
            await deleteEvaluationRunFn('1');
          } catch (error) {
            console.error('Delete failed:', error);
          }
        }}
      >
        Delete Run
      </button>

      <button
        type="button"
        data-testid="get-run-by-id"
        onClick={() => {
          const run = getEvaluationRunById('1');
          if (run) {
            setSelectedEvaluationRun(run);
          }
        }}
      >
        Get Run By ID
      </button>

      <button
        type="button"
        data-testid="refresh-runs"
        onClick={refreshEvaluationRuns}
      >
        Refresh Runs
      </button>

      <button
        type="button"
        data-testid="load-outputs"
        onClick={() => loadDataPointOutputs('1', { limit: 10 })}
      >
        Load Outputs
      </button>

      <button
        type="button"
        data-testid="set-output-query-params"
        onClick={() => setDataPointOutputQueryParams({ score_min: 0.8 })}
      >
        Set Output Query Params
      </button>

      <button
        type="button"
        data-testid="refetch-outputs"
        onClick={refetchDataPointOutputs}
      >
        Refetch Outputs
      </button>
    </div>
  );
}

describe('EvaluationRunsProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Reset mocks
    vi.clearAllMocks();
    vi.mocked(createEvaluationRun).mockResolvedValue({
      id: '3',
      dataset_id: 'dataset-3',
      agent_id: 'agent-3',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      name: 'New Run',
      description: 'New Description',
      status: EvaluationRunStatus.PENDING,
      results: {},
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    });
    vi.mocked(queryEvaluationRuns).mockResolvedValue(mockEvaluationRuns);
    vi.mocked(updateEvaluationRun).mockResolvedValue({
      ...mockEvaluationRuns[0],
      description: 'Updated Description',
    });
    vi.mocked(deleteEvaluationRun).mockResolvedValue();
    vi.mocked(getDataPointOutputs).mockResolvedValue(mockDataPointOutputs);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides evaluation runs data and loading states', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('runs-count').textContent).toBe('2');
    expect(screen.getByTestId('error').textContent).toBe('no error');
    expect(queryEvaluationRuns).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      limit: 20,
      offset: 0,
    });
  });

  it('handles evaluation run creation successfully', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('create-loading').textContent).toBe(
      'not creating',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('create-run'));
    });

    await waitFor(() => {
      expect(createEvaluationRun).toHaveBeenCalledWith({
        dataset_id: 'dataset-3',
        agent_id: 'agent-3',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        name: 'New Run',
        description: 'New Description',
        metadata: {},
      });
    });
  });

  it('handles query parameter updates', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('query-params').textContent).toBe(
      JSON.stringify({ agent_id: 'agent-1' }),
    );

    // Mock a second call for when params change
    vi.mocked(queryEvaluationRuns).mockResolvedValueOnce(
      mockEvaluationRuns.filter((r) => r.dataset_id === 'dataset-1'),
    );

    act(() => {
      fireEvent.click(screen.getByTestId('set-query-params'));
    });

    expect(screen.getByTestId('query-params').textContent).toBe(
      JSON.stringify({ dataset_id: 'dataset-1', agent_id: 'agent-1' }),
    );

    // Should trigger refetch with new params
    await waitFor(() => {
      expect(queryEvaluationRuns).toHaveBeenCalledWith({
        dataset_id: 'dataset-1',
        agent_id: 'agent-1',
        limit: 20,
        offset: 0,
      });
    });
  });

  it('manages selected evaluation run state', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('selected-run-id').textContent).toBe('none');

    act(() => {
      fireEvent.click(screen.getByTestId('select-run'));
    });

    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');
  });

  it('handles evaluation run updates successfully', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('update-loading').textContent).toBe(
      'not updating',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('update-run'));
    });

    await waitFor(() => {
      expect(updateEvaluationRun).toHaveBeenCalledWith('1', {
        description: 'Updated Description',
      });
    });
  });

  it('handles evaluation run deletion successfully', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Select a run first
    await act(() => {
      fireEvent.click(screen.getByTestId('select-run'));
    });
    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');

    expect(screen.getByTestId('delete-loading').textContent).toBe(
      'not deleting',
    );

    await act(() => {
      fireEvent.click(screen.getByTestId('delete-run'));
    });

    await waitFor(() => {
      expect(deleteEvaluationRun).toHaveBeenCalledWith('1');
    });

    // Selected run should be cleared after deletion
    expect(screen.getByTestId('selected-run-id').textContent).toBe('none');
  });

  it('provides getEvaluationRunById helper function', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('selected-run-id').textContent).toBe('none');

    act(() => {
      fireEvent.click(screen.getByTestId('get-run-by-id'));
    });

    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');
  });

  it('handles manual data point outputs loading with loadDataPointOutputs function', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Initially no outputs loaded
    expect(screen.getByTestId('outputs-count').textContent).toBe('0');

    // Load outputs for run 1 manually
    act(() => {
      fireEvent.click(screen.getByTestId('load-outputs'));
    });

    // Should select the run and set query params
    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');
    expect(screen.getByTestId('output-query-params').textContent).toBe(
      JSON.stringify({ limit: 10 }),
    );

    // Wait for outputs to load
    await waitFor(() => {
      expect(screen.getByTestId('outputs-count').textContent).toBe('2');
    });

    expect(getDataPointOutputs).toHaveBeenCalledWith('1', { limit: 10 });
  });

  it('handles API errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });

    vi.mocked(queryEvaluationRuns).mockRejectedValue(new Error('API Error'));

    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('API Error');
    });

    consoleError.mockRestore();
  });

  it('throws error when useEvaluationRuns is used outside provider', () => {
    function BadComponent(): React.ReactElement | null {
      useEvaluationRuns();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useEvaluationRuns must be used within an EvaluationRunsProvider',
    );
  });

  it('separates error states correctly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });

    vi.mocked(createEvaluationRun).mockRejectedValue(new Error('Create Error'));
    vi.mocked(updateEvaluationRun).mockRejectedValue(new Error('Update Error'));
    vi.mocked(deleteEvaluationRun).mockRejectedValue(new Error('Delete Error'));

    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Test create error
    await act(() => {
      fireEvent.click(screen.getByTestId('create-run'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('create-error').textContent).toBe(
        'Create Error',
      );
    });

    consoleError.mockRestore();
  });

  it('handles delete errors and clears selected run', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });

    // Mock delete to fail
    vi.mocked(deleteEvaluationRun).mockRejectedValue(
      new Error('Delete failed'),
    );

    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Should show 2 runs initially
    expect(screen.getByTestId('runs-count').textContent).toBe('2');

    // Select a run first
    act(() => {
      fireEvent.click(screen.getByTestId('select-run'));
    });
    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');

    // Attempt delete (should fail)
    await act(() => {
      fireEvent.click(screen.getByTestId('delete-run'));
    });

    // Selected run should be cleared on delete attempt
    expect(screen.getByTestId('selected-run-id').textContent).toBe('none');

    // Should show delete error
    await waitFor(() => {
      expect(screen.getByTestId('delete-error').textContent).toBe(
        'Delete failed',
      );
    });

    consoleError.mockRestore();
  });

  it('automatically refetches when query parameters change', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Initial call with agent_id
    expect(queryEvaluationRuns).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      limit: 20,
      offset: 0,
    });

    // Check that the initial call was made
    expect(queryEvaluationRuns).toHaveBeenCalledTimes(1);

    // Mock filtered results for the next call
    vi.mocked(queryEvaluationRuns).mockResolvedValueOnce([
      mockEvaluationRuns[0],
    ]);

    // Change query params with dataset filter
    act(() => {
      fireEvent.click(screen.getByTestId('set-query-params'));
    });

    // Should automatically trigger new query due to queryKey change
    await waitFor(() => {
      expect(queryEvaluationRuns).toHaveBeenCalledTimes(2);
      expect(queryEvaluationRuns).toHaveBeenLastCalledWith({
        dataset_id: 'dataset-1',
        agent_id: 'agent-1',
        limit: 20,
        offset: 0,
      });
    });
  });

  it('invalidates cache on successful mutations', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Test create invalidation
    await act(() => {
      fireEvent.click(screen.getByTestId('create-run'));
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: evaluationRunQueryKeys.lists(),
      });
    });

    // Clear and test delete invalidation
    invalidateQueriesSpy.mockClear();

    await act(() => {
      fireEvent.click(screen.getByTestId('delete-run'));
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: evaluationRunQueryKeys.lists(),
      });
    });

    invalidateQueriesSpy.mockRestore();
  });

  it('updates selected run when updated run is selected', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Select a run
    act(() => {
      fireEvent.click(screen.getByTestId('select-run'));
    });
    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');

    // Update the selected run
    await act(() => {
      fireEvent.click(screen.getByTestId('update-run'));
    });

    // The selected run should be updated with new data
    await waitFor(() => {
      expect(updateEvaluationRun).toHaveBeenCalledWith('1', {
        description: 'Updated Description',
      });
    });

    // Selected run should still be selected (with updated data)
    expect(screen.getByTestId('selected-run-id').textContent).toBe('1');
  });

  it('manages data point output query parameters', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    expect(screen.getByTestId('output-query-params').textContent).toBe('{}');

    act(() => {
      fireEvent.click(screen.getByTestId('set-output-query-params'));
    });

    expect(screen.getByTestId('output-query-params').textContent).toBe(
      JSON.stringify({ score_min: 0.8 }),
    );
  });

  it('validates query keys structure', () => {
    expect(evaluationRunQueryKeys.all).toEqual(['evaluationRuns']);
    expect(evaluationRunQueryKeys.lists()).toEqual(['evaluationRuns', 'list']);
    expect(evaluationRunQueryKeys.list({ dataset_id: 'dataset-1' })).toEqual([
      'evaluationRuns',
      'list',
      { dataset_id: 'dataset-1' },
    ]);
    expect(evaluationRunQueryKeys.details()).toEqual([
      'evaluationRuns',
      'detail',
    ]);
    expect(evaluationRunQueryKeys.detail('123')).toEqual([
      'evaluationRuns',
      'detail',
      '123',
    ]);
    expect(evaluationRunQueryKeys.dataPointOutputs('123')).toEqual([
      'evaluationRuns',
      'detail',
      '123',
      'dataPointOutputs',
    ]);
    expect(
      evaluationRunQueryKeys.dataPointOutputsList('123', { limit: 10 }),
    ).toEqual([
      'evaluationRuns',
      'detail',
      '123',
      'dataPointOutputs',
      { limit: 10 },
    ]);
  });

  it('only fetches data point outputs when manually requested', async () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <EvaluationRunsProvider>
            <TestComponent initialQueryParams={{ agent_id: 'agent-1' }} />
          </EvaluationRunsProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Initially no run selected, so no outputs should be fetched
    expect(getDataPointOutputs).not.toHaveBeenCalled();
    expect(screen.getByTestId('outputs-count').textContent).toBe('0');

    // Select a run - outputs should still not be fetched automatically
    act(() => {
      fireEvent.click(screen.getByTestId('select-run'));
    });

    // Outputs should still not be fetched automatically
    expect(getDataPointOutputs).not.toHaveBeenCalled();
    expect(screen.getByTestId('outputs-count').textContent).toBe('0');

    // Only when we manually load outputs should they be fetched
    act(() => {
      fireEvent.click(screen.getByTestId('load-outputs'));
    });

    await waitFor(() => {
      expect(getDataPointOutputs).toHaveBeenCalledWith('1', { limit: 10 });
      expect(screen.getByTestId('outputs-count').textContent).toBe('2');
    });
  });
});
