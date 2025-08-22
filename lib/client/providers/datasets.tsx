'use client';

import {
  addDataPoints,
  createDataset,
  deleteDataPoints,
  deleteDataset,
  getDatasetDataPoints,
  getDatasets,
  updateDataset,
} from '@client/api/v1/idk/evaluations/datasets';
import { useToast } from '@client/hooks/use-toast';
import type {
  DataPoint,
  DataPointCreateParams,
  DataPointQueryParams,
  Dataset,
  DatasetCreateParams,
  DatasetQueryParams,
  DatasetUpdateParams,
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
  dataPoints: (datasetId: string) =>
    [...datasetQueryKeys.detail(datasetId), 'dataPoints'] as const,
  dataPointsList: (datasetId: string, params: DataPointQueryParams) =>
    [...datasetQueryKeys.dataPoints(datasetId), params] as const,
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

  // Data points functionality
  dataPoints: DataPoint[];
  dataPointsLoading: boolean;
  dataPointsError: Error | null;
  dataPointQueryParams: DataPointQueryParams;
  setDataPointQueryParams: (params: DataPointQueryParams) => void;
  refetchDataPoints: () => void;

  // Data points mutation functions
  addDataPoints: (
    datasetId: string,
    dataPoints: DataPointCreateParams[],
    options?: { signal?: AbortSignal },
  ) => Promise<DataPoint[]>;
  deleteDataPoints: (
    datasetId: string,
    dataPointIds: string[],
  ) => Promise<void>;

  // Data points mutation states
  isAddingDataPoints: boolean;
  isDeletingDataPoints: boolean;
  addDataPointsError: Error | null;
  deleteDataPointsError: Error | null;

  // Pagination
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getDatasetById: (id: string) => Dataset | undefined;
  refreshDatasets: () => void;
  loadDataPoints: (datasetId: string, params?: DataPointQueryParams) => void;
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
  const [dataPointQueryParams, setDataPointQueryParams] =
    useState<DataPointQueryParams>({});
  const [shouldFetchDataPoints, setShouldFetchDataPoints] = useState(false);

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

  // Data points query - only fetch when manually requested
  const {
    data: dataPoints = [],
    isLoading: dataPointsLoading,
    error: dataPointsError,
    refetch: refetchDataPoints,
  }: UseQueryResult<DataPoint[], Error> = useQuery({
    queryKey: selectedDataset
      ? datasetQueryKeys.dataPointsList(
          selectedDataset.id,
          dataPointQueryParams,
        )
      : ['dataPoints', 'none'],
    queryFn: async () => {
      if (!selectedDataset) {
        return [];
      }

      try {
        const result = await getDatasetDataPoints(
          selectedDataset.id,
          dataPointQueryParams,
        );
        // Reset shouldFetchDataPoints after successful fetch (only if still mounted)
        if (isMountedRef.current) {
          setShouldFetchDataPoints(false);
        }
        return result;
      } catch (error) {
        // Reset shouldFetchDataPoints after failed fetch (only if still mounted)
        if (isMountedRef.current) {
          setShouldFetchDataPoints(false);
        }
        throw error;
      }
    },
    enabled: shouldFetchDataPoints && !!selectedDataset,
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

  // Add data points mutation
  const addDataPointsMutation = useMutation({
    mutationFn: ({
      datasetId,
      dataPoints,
      options,
    }: {
      datasetId: string;
      dataPoints: DataPointCreateParams[];
      options?: { signal?: AbortSignal };
    }) => addDataPoints(datasetId, dataPoints, options),
    onSuccess: (newDataPoints, { datasetId }) => {
      // Invalidate all data points queries for this dataset to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: datasetQueryKeys.dataPoints(datasetId),
      });

      // Also invalidate direct dataset data points queries
      queryClient.invalidateQueries({
        queryKey: ['dataset', datasetId, 'dataPoints'],
      });

      // Also trigger a manual refetch of the current data points
      refetchDataPoints();

      if (isMountedRef.current) {
        toast({
          title: 'Data points added',
          description: `${newDataPoints.length} data points have been added successfully.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error adding data points:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error adding data points',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    },
  });

  // Delete data points mutation
  const deleteDataPointsMutation = useMutation({
    mutationFn: ({
      datasetId,
      dataPointIds,
    }: {
      datasetId: string;
      dataPointIds: string[];
    }) => deleteDataPoints(datasetId, dataPointIds),
    onSuccess: (_, { datasetId, dataPointIds }) => {
      // Remove from data points cache
      queryClient.setQueryData<DataPoint[]>(
        datasetQueryKeys.dataPointsList(datasetId, dataPointQueryParams),
        (oldData) =>
          oldData?.filter((dp) => !dataPointIds.includes(dp.id)) ?? [],
      );

      // Invalidate data points queries
      queryClient.invalidateQueries({
        queryKey: datasetQueryKeys.dataPoints(datasetId),
      });

      // Also invalidate the direct dataset data points query used by dataset-view
      queryClient.invalidateQueries({
        queryKey: ['dataset', datasetId, 'dataPoints'],
      });

      if (isMountedRef.current) {
        toast({
          title: 'Data points deleted',
          description: `${dataPointIds.length} data points have been deleted successfully.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error deleting data points:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error deleting data points',
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

  const loadDataPoints = useCallback(
    (datasetId: string, params: DataPointQueryParams = {}) => {
      const dataset = getDatasetById(datasetId);
      if (dataset) {
        setSelectedDataset(dataset);
        setDataPointQueryParams(params);
        setShouldFetchDataPoints(true);
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

  const addDataPointsHandler = useCallback(
    (
      datasetId: string,
      dataPoints: DataPointCreateParams[],
      options?: { signal?: AbortSignal },
    ): Promise<DataPoint[]> => {
      return new Promise((resolve, reject) => {
        addDataPointsMutation.mutate(
          { datasetId, dataPoints, options },
          {
            onSuccess: (result) => resolve(result),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [addDataPointsMutation],
  );

  const deleteDataPointsHandler = useCallback(
    (datasetId: string, dataPointIds: string[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        deleteDataPointsMutation.mutate(
          { datasetId, dataPointIds },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [deleteDataPointsMutation],
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
        setShouldFetchDataPoints(false);
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

    // Data points functionality
    dataPoints,
    dataPointsLoading,
    dataPointsError,
    dataPointQueryParams,
    setDataPointQueryParams,
    refetchDataPoints,

    // Data points mutation functions
    addDataPoints: addDataPointsHandler,
    deleteDataPoints: deleteDataPointsHandler,

    // Data points mutation states
    isAddingDataPoints: addDataPointsMutation.isPending,
    isDeletingDataPoints: deleteDataPointsMutation.isPending,
    addDataPointsError: addDataPointsMutation.error,
    deleteDataPointsError: deleteDataPointsMutation.error,

    // Pagination
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

    // Helper functions
    getDatasetById,
    refreshDatasets,
    loadDataPoints,
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
