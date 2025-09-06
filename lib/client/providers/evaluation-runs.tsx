'use client';

import {
  createEvaluationRun,
  deleteEvaluationRun,
  getLogOutputs,
  queryEvaluationRuns,
  updateEvaluationRun,
} from '@client/api/v1/idk/evaluations/runs';
import { useToast } from '@client/hooks/use-toast';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
  EvaluationRunQueryParams,
  EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';
import type {
  LogOutput,
  LogOutputQueryParams,
} from '@shared/types/data/log-output';
import {
  type UseQueryResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const evaluationRunQueryKeys = {
  all: ['evaluationRuns'] as const,
  lists: () => [...evaluationRunQueryKeys.all, 'list'] as const,
  list: (params: EvaluationRunQueryParams) =>
    [...evaluationRunQueryKeys.lists(), params] as const,
  details: () => [...evaluationRunQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...evaluationRunQueryKeys.details(), id] as const,
  logOutputs: (runId: string) =>
    [...evaluationRunQueryKeys.detail(runId), 'logOutputs'] as const,
  logOutputsList: (runId: string, params: LogOutputQueryParams) =>
    [...evaluationRunQueryKeys.logOutputs(runId), params] as const,
};

interface EvaluationRunsContextType {
  // Query state
  evaluationRuns: EvaluationRun[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: EvaluationRunQueryParams;
  setQueryParams: (params: EvaluationRunQueryParams) => void;

  // Selected evaluation run state
  selectedEvaluationRun: EvaluationRun | null;
  setSelectedEvaluationRun: (run: EvaluationRun | null) => void;

  // Mutation functions
  createEvaluationRun: (
    params: EvaluationRunCreateParams,
  ) => Promise<EvaluationRun>;
  updateEvaluationRun: (
    runId: string,
    params: EvaluationRunUpdateParams,
  ) => Promise<void>;
  deleteEvaluationRun: (runId: string) => Promise<void>;

  // Separate mutation states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;

  // Log outputs functionality
  logOutputs: LogOutput[];
  logOutputsLoading: boolean;
  logOutputsError: Error | null;
  logOutputQueryParams: LogOutputQueryParams;
  setLogOutputQueryParams: (params: LogOutputQueryParams) => void;
  refetchLogOutputs: () => void;

  // Pagination
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getEvaluationRunById: (id: string) => EvaluationRun | undefined;
  refreshEvaluationRuns: () => void;
  loadLogOutputs: (runId: string, params?: LogOutputQueryParams) => void;
}

const EvaluationRunsContext = createContext<
  EvaluationRunsContextType | undefined
>(undefined);

export const EvaluationRunsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [queryParams, setQueryParams] = useState<EvaluationRunQueryParams>({});
  const [selectedEvaluationRun, setSelectedEvaluationRun] =
    useState<EvaluationRun | null>(null);
  const [logOutputQueryParams, setLogOutputQueryParams] =
    useState<LogOutputQueryParams>({});
  const [shouldFetchLogOutputs, setShouldFetchLogOutputs] = useState(false);

  // Memoize the select function to ensure stable reference
  const selectFlattenedData = useCallback(
    (data: { pages: EvaluationRun[][] }) => data?.pages?.flat() ?? [],
    [],
  );

  // Evaluation runs infinite query for pagination
  const {
    data: evaluationRuns = [],
    isLoading,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: evaluationRunQueryKeys.list(queryParams),
    queryFn: ({ pageParam = 0 }) =>
      queryEvaluationRuns({
        ...queryParams,
        limit: queryParams.limit || 20,
        offset: pageParam,
      }),
    select: selectFlattenedData, // Transform data at query level - most efficient
    getNextPageParam: (lastPage, allPages) => {
      const currentLength = allPages.flat().length;
      if (lastPage.length < (queryParams.limit || 20)) {
        return undefined;
      }
      return currentLength;
    },
    initialPageParam: 0,
    enabled: !!queryParams.agent_id, // Only fetch when we have agent_id (skill_id is optional for broader queries)
  });

  // Log outputs query - only fetch when manually requested
  const {
    data: logOutputs = [],
    isLoading: logOutputsLoading,
    error: logOutputsError,
    refetch: refetchLogOutputs,
  }: UseQueryResult<LogOutput[], Error> = useQuery({
    queryKey: selectedEvaluationRun
      ? evaluationRunQueryKeys.logOutputsList(
          selectedEvaluationRun.id,
          logOutputQueryParams,
        )
      : ['logOutputs', 'none'],
    queryFn: async () => {
      if (!selectedEvaluationRun) {
        return [];
      }

      try {
        const result = await getLogOutputs(
          selectedEvaluationRun.id,
          logOutputQueryParams,
        );
        // Reset shouldFetchLogOutputs after successful fetch
        setShouldFetchLogOutputs(false);
        return result;
      } catch (error) {
        // Reset shouldFetchLogOutputs after failed fetch
        setShouldFetchLogOutputs(false);
        throw error;
      }
    },
    enabled: shouldFetchLogOutputs && !!selectedEvaluationRun,
  });

  // Create evaluation run mutation
  const createEvaluationRunMutation = useMutation({
    mutationFn: (params: EvaluationRunCreateParams) =>
      createEvaluationRun(params),
    onSuccess: (newRun) => {
      // Invalidate all lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: evaluationRunQueryKeys.lists(),
      });

      toast({
        title: 'Evaluation run created',
        description: `${newRun.name} has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error creating evaluation run:', error);
      toast({
        title: 'Error creating evaluation run',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Update evaluation run mutation
  const updateEvaluationRunMutation = useMutation({
    mutationFn: ({
      runId,
      params,
    }: {
      runId: string;
      params: EvaluationRunUpdateParams;
    }) => updateEvaluationRun(runId, params),
    onSuccess: (updatedRun) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: evaluationRunQueryKeys.lists(),
      });

      // Update selected evaluation run if it's the one being updated
      if (selectedEvaluationRun?.id === updatedRun.id) {
        setSelectedEvaluationRun(updatedRun);
      }

      toast({
        title: 'Evaluation run updated',
        description: `${updatedRun.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating evaluation run:', error);
      toast({
        title: 'Error updating evaluation run',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Delete evaluation run mutation
  const deleteEvaluationRunMutation = useMutation({
    mutationFn: (runId: string) => deleteEvaluationRun(runId),
    onMutate: (runId) => {
      // Clear selected evaluation run if it's the one being deleted
      if (selectedEvaluationRun?.id === runId) {
        setSelectedEvaluationRun(null);
      }
    },
    onSuccess: () => {
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: evaluationRunQueryKeys.lists(),
      });

      toast({
        title: 'Evaluation run deleted',
        description: 'Evaluation run has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting evaluation run:', error);
      toast({
        title: 'Error deleting evaluation run',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Helper functions
  const getEvaluationRunById = useCallback(
    (id: string): EvaluationRun | undefined => {
      return evaluationRuns?.find((run: EvaluationRun) => run.id === id);
    },
    [evaluationRuns],
  );

  const refreshEvaluationRuns = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: evaluationRunQueryKeys.all,
    });
  }, [queryClient]);

  const loadLogOutputs = useCallback(
    (runId: string, params: LogOutputQueryParams = {}) => {
      const run = getEvaluationRunById(runId);
      if (run) {
        setSelectedEvaluationRun(run);
        setLogOutputQueryParams(params);
        setShouldFetchLogOutputs(true);
      }
    },
    [getEvaluationRunById],
  );

  // Simplified mutation functions
  const createEvaluationRunHandler = useCallback(
    (params: EvaluationRunCreateParams): Promise<EvaluationRun> => {
      return new Promise((resolve, reject) => {
        createEvaluationRunMutation.mutate(params, {
          onSuccess: (run) => resolve(run),
          onError: (error) => reject(error),
        });
      });
    },
    [createEvaluationRunMutation],
  );

  const updateEvaluationRunHandler = useCallback(
    (runId: string, params: EvaluationRunUpdateParams): Promise<void> => {
      return new Promise((resolve, reject) => {
        updateEvaluationRunMutation.mutate(
          { runId, params },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [updateEvaluationRunMutation],
  );

  const deleteEvaluationRunHandler = useCallback(
    (runId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        deleteEvaluationRunMutation.mutate(runId, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
    },
    [deleteEvaluationRunMutation],
  );

  const contextValue: EvaluationRunsContextType = {
    // Query state
    evaluationRuns,
    isLoading,
    error,
    refetch,

    // Query parameters
    queryParams,
    setQueryParams,

    // Selected evaluation run state
    selectedEvaluationRun,
    setSelectedEvaluationRun: (run: EvaluationRun | null) => {
      setSelectedEvaluationRun(run);
      if (!run) {
        setShouldFetchLogOutputs(false);
      }
    },

    // Mutation functions
    createEvaluationRun: createEvaluationRunHandler,
    updateEvaluationRun: updateEvaluationRunHandler,
    deleteEvaluationRun: deleteEvaluationRunHandler,

    // Separate mutation states
    isCreating: createEvaluationRunMutation.isPending,
    isUpdating: updateEvaluationRunMutation.isPending,
    isDeleting: deleteEvaluationRunMutation.isPending,
    createError: createEvaluationRunMutation.error,
    updateError: updateEvaluationRunMutation.error,
    deleteError: deleteEvaluationRunMutation.error,

    // Log outputs functionality
    logOutputs,
    logOutputsLoading,
    logOutputsError,
    logOutputQueryParams,
    setLogOutputQueryParams,
    refetchLogOutputs,

    // Pagination
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

    // Helper functions
    getEvaluationRunById,
    refreshEvaluationRuns,
    loadLogOutputs,
  };

  return (
    <EvaluationRunsContext.Provider value={contextValue}>
      {children}
    </EvaluationRunsContext.Provider>
  );
};

export const useEvaluationRuns = (): EvaluationRunsContextType => {
  const context = useContext(EvaluationRunsContext);
  if (!context) {
    throw new Error(
      'useEvaluationRuns must be used within an EvaluationRunsProvider',
    );
  }
  return context;
};
