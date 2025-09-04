'use client';

import {
  addDatasetLogs,
  createDataset,
  deleteDataset,
  deleteDatasetLogs,
  getDatasetLogs,
  getDatasets,
  updateDataset,
} from '@client/api/v1/idk/evaluations/datasets';
import { useToast } from '@client/hooks/use-toast';
import type {
  Dataset,
  DatasetCreateParams,
  DatasetQueryParams,
  DatasetUpdateParams,
  Log,
  LogsQueryParams,
} from '@shared/types/data';
import {
  type UseQueryResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// Query keys for React Query caching
export const datasetQueryKeys = {
  all: ['datasets'] as const,
  lists: () => [...datasetQueryKeys.all, 'list'] as const,
  list: (params: DatasetQueryParams) =>
    [...datasetQueryKeys.lists(), params] as const,
  details: () => [...datasetQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...datasetQueryKeys.details(), id] as const,
  logs: (datasetId: string) =>
    [...datasetQueryKeys.detail(datasetId), 'logs'] as const,
  logsList: (datasetId: string, params: LogsQueryParams) =>
    [...datasetQueryKeys.logs(datasetId), params] as const,
};

interface DatasetsContextType {
  // Query state
  datasets: Dataset[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: DatasetQueryParams;
  setQueryParams: (params: DatasetQueryParams) => void;

  // Selected dataset state
  selectedDataset: Dataset | null;
  setSelectedDataset: (dataset: Dataset | null) => void;

  // Dataset mutation functions
  createDataset: (params: DatasetCreateParams) => Promise<Dataset>;
  updateDataset: (
    datasetId: string,
    params: DatasetUpdateParams,
  ) => Promise<void>;
  deleteDataset: (datasetId: string) => Promise<void>;

  // Dataset mutation states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;

  // Logs functionality
  logs: Log[];
  logsLoading: boolean;
  logsError: Error | null;
  logQueryParams: LogsQueryParams;
  setLogQueryParams: (params: LogsQueryParams) => void;
  refetchLogs: () => void;

  // Logs mutation functions
  addLogs: (
    datasetId: string,
    logIds: string[],
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
  deleteLogs: (datasetId: string, logIds: string[]) => Promise<void>;

  // Logs mutation states
  isAddingLogs: boolean;
  isDeletingLogs: boolean;
  addLogsError: Error | null;
  deleteLogsError: Error | null;

  // Pagination
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getDatasetById: (id: string) => Dataset | undefined;
  refreshDatasets: () => void;
  loadLogs: (datasetId: string, params?: LogsQueryParams) => void;
}

const DatasetsContext = createContext<DatasetsContextType | undefined>(
  undefined,
);

export const DatasetsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);

  const [queryParams, setQueryParams] = useState<DatasetQueryParams>({});
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [logQueryParams, setLogQueryParams] = useState<LogsQueryParams>({
    limit: 50,
    offset: 0,
  });
  const [shouldFetchLogs, setShouldFetchLogs] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Datasets infinite query for pagination
  // Memoize the select function to ensure stable reference
  const selectFlattenedData = useCallback(
    (data: { pages: Dataset[][] }) => data?.pages?.flat() ?? [],
    [],
  );

  const {
    data: datasets = [],
    isLoading,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: datasetQueryKeys.list(queryParams),
    queryFn: ({ pageParam = 0 }) =>
      getDatasets({
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
  });

  // Logs query - only fetch when manually requested
  const {
    data: logs = [],
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  }: UseQueryResult<Log[], Error> = useQuery({
    queryKey: selectedDataset
      ? datasetQueryKeys.logsList(selectedDataset.id, logQueryParams)
      : ['logs', 'none'],
    queryFn: async () => {
      if (!selectedDataset) {
        return [];
      }

      try {
        const result = await getDatasetLogs(selectedDataset.id, logQueryParams);
        // Reset shouldFetchLogs after successful fetch (only if still mounted)
        if (isMountedRef.current) {
          setShouldFetchLogs(false);
        }
        return result;
      } catch (error) {
        // Reset shouldFetchLogs after failed fetch (only if still mounted)
        if (isMountedRef.current) {
          setShouldFetchLogs(false);
        }
        throw error;
      }
    },
    enabled: shouldFetchLogs && !!selectedDataset,
  });

  // Create dataset mutation
  const createDatasetMutation = useMutation({
    mutationFn: (params: DatasetCreateParams) => createDataset(params),
    onSuccess: (newDataset) => {
      // Invalidate all lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: datasetQueryKeys.lists() });

      if (isMountedRef.current) {
        toast({
          title: 'Dataset created',
          description: `${newDataset.name} has been created successfully.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error creating dataset:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error creating dataset',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    },
  });

  // Update dataset mutation
  const updateDatasetMutation = useMutation({
    mutationFn: ({
      datasetId,
      params,
    }: {
      datasetId: string;
      params: DatasetUpdateParams;
    }) => updateDataset(datasetId, params),
    onSuccess: (updatedDataset) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: datasetQueryKeys.lists() });

      if (isMountedRef.current) {
        // Update selected dataset if it's the one being updated
        if (selectedDataset?.id === updatedDataset.id) {
          setSelectedDataset(updatedDataset);
        }

        toast({
          title: 'Dataset updated',
          description: `${updatedDataset.name} has been updated successfully.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error updating dataset:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error updating dataset',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    },
  });

  // Delete dataset mutation
  const deleteDatasetMutation = useMutation({
    mutationFn: (datasetId: string) => deleteDataset(datasetId),
    onMutate: (datasetId) => {
      // Clear selected dataset if it's the one being deleted
      if (isMountedRef.current && selectedDataset?.id === datasetId) {
        setSelectedDataset(null);
      }
    },
    onSuccess: () => {
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: datasetQueryKeys.lists() });

      if (isMountedRef.current) {
        toast({
          title: 'Dataset deleted',
          description: 'Dataset has been deleted successfully.',
        });
      }
    },
    onError: (error) => {
      console.error('Error deleting dataset:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error deleting dataset',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    },
  });

  // Add logs mutation
  const addLogsMutation = useMutation({
    mutationFn: ({
      datasetId,
      logIds,
      options,
    }: {
      datasetId: string;
      logIds: string[];
      options?: { signal?: AbortSignal };
    }) => addDatasetLogs(datasetId, logIds, options),
    onSuccess: (_, { datasetId, logIds }) => {
      // Invalidate all logs queries for this dataset to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: datasetQueryKeys.logs(datasetId),
      });

      // Also invalidate direct dataset logs queries
      queryClient.invalidateQueries({
        queryKey: ['dataset', datasetId, 'logs'],
      });

      // Also trigger a manual refetch of the current logs
      refetchLogs();

      if (isMountedRef.current) {
        toast({
          title: 'Logs added',
          description: `${logIds.length} logs have been added successfully.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error adding logs:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error adding logs',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    },
  });

  // Delete logs mutation
  const deleteLogsMutation = useMutation({
    mutationFn: ({
      datasetId,
      logIds,
    }: {
      datasetId: string;
      logIds: string[];
    }) => deleteDatasetLogs(datasetId, logIds),
    onSuccess: (_, { datasetId, logIds }) => {
      // Remove from logs cache
      queryClient.setQueryData<Log[]>(
        datasetQueryKeys.logsList(datasetId, logQueryParams),
        (oldData) => oldData?.filter((log) => !logIds.includes(log.id)) ?? [],
      );

      // Invalidate logs queries
      queryClient.invalidateQueries({
        queryKey: datasetQueryKeys.logs(datasetId),
      });

      // Also invalidate the direct dataset logs query used by dataset-view
      queryClient.invalidateQueries({
        queryKey: ['dataset', datasetId, 'logs'],
      });

      if (isMountedRef.current) {
        toast({
          title: 'Logs deleted',
          description: `${logIds.length} logs have been deleted successfully.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error deleting logs:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error deleting logs',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    },
  });

  // Helper functions
  const getDatasetById = useCallback(
    (id: string): Dataset | undefined => {
      return datasets?.find((dataset: Dataset) => dataset.id === id);
    },
    [datasets],
  );

  const refreshDatasets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: datasetQueryKeys.all });
  }, [queryClient]);

  const loadLogs = useCallback(
    (datasetId: string, params: LogsQueryParams = { limit: 50, offset: 0 }) => {
      const dataset = getDatasetById(datasetId);
      if (dataset) {
        setSelectedDataset(dataset);
        setLogQueryParams(params);
        setShouldFetchLogs(true);
      }
    },
    [getDatasetById],
  );

  // Simplified mutation functions
  const createDatasetHandler = useCallback(
    (params: DatasetCreateParams): Promise<Dataset> => {
      return new Promise((resolve, reject) => {
        createDatasetMutation.mutate(params, {
          onSuccess: (dataset) => resolve(dataset),
          onError: (error) => reject(error),
        });
      });
    },
    [createDatasetMutation],
  );

  const updateDatasetHandler = useCallback(
    (datasetId: string, params: DatasetUpdateParams): Promise<void> => {
      return new Promise((resolve, reject) => {
        updateDatasetMutation.mutate(
          { datasetId, params },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [updateDatasetMutation],
  );

  const deleteDatasetHandler = useCallback(
    (datasetId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        deleteDatasetMutation.mutate(datasetId, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
    },
    [deleteDatasetMutation],
  );

  const addLogsHandler = useCallback(
    (
      datasetId: string,
      logIds: string[],
      options?: { signal?: AbortSignal },
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        addLogsMutation.mutate(
          { datasetId, logIds, options },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [addLogsMutation],
  );

  const deleteLogsHandler = useCallback(
    (datasetId: string, logIds: string[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        deleteLogsMutation.mutate(
          { datasetId, logIds },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [deleteLogsMutation],
  );

  const contextValue: DatasetsContextType = {
    // Query state
    datasets,
    isLoading,
    error,
    refetch,

    // Query parameters
    queryParams,
    setQueryParams,

    // Selected dataset state
    selectedDataset,
    setSelectedDataset: (dataset: Dataset | null) => {
      setSelectedDataset(dataset);
      if (!dataset) {
        setShouldFetchLogs(false);
      }
    },

    // Dataset mutation functions
    createDataset: createDatasetHandler,
    updateDataset: updateDatasetHandler,
    deleteDataset: deleteDatasetHandler,

    // Dataset mutation states
    isCreating: createDatasetMutation.isPending,
    isUpdating: updateDatasetMutation.isPending,
    isDeleting: deleteDatasetMutation.isPending,
    createError: createDatasetMutation.error,
    updateError: updateDatasetMutation.error,
    deleteError: deleteDatasetMutation.error,

    // Logs functionality
    logs,
    logsLoading,
    logsError,
    logQueryParams,
    setLogQueryParams,
    refetchLogs,

    // Logs mutation functions
    addLogs: addLogsHandler,
    deleteLogs: deleteLogsHandler,

    // Logs mutation states
    isAddingLogs: addLogsMutation.isPending,
    isDeletingLogs: deleteLogsMutation.isPending,
    addLogsError: addLogsMutation.error,
    deleteLogsError: deleteLogsMutation.error,

    // Pagination
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

    // Helper functions
    getDatasetById,
    refreshDatasets,
    loadLogs,
  };

  return (
    <DatasetsContext.Provider value={contextValue}>
      {children}
    </DatasetsContext.Provider>
  );
};

export const useDatasets = (): DatasetsContextType => {
  const context = useContext(DatasetsContext);
  if (!context) {
    throw new Error('useDatasets must be used within a DatasetsProvider');
  }
  return context;
};
