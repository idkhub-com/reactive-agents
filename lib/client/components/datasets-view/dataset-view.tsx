import { getDatasetDataPoints } from '@client/api/v1/idk/evaluations/datasets';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { Skeleton } from '@client/components/ui/skeleton';
import { useDebounce } from '@client/hooks/use-debounce';
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import type { DataPoint, DatasetUpdateParams } from '@shared/types/data';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddDataPointsDialog } from './components/add-data-points-dialog';
import { DataPointsSection } from './components/data-points-section';
import { DatasetHeader } from './components/dataset-header';
import { DeleteDialogs } from './components/delete-dialogs';

interface DatasetViewContentProps {
  datasetId: string;
}

export function DatasetView({
  datasetId,
}: DatasetViewContentProps): React.ReactElement {
  const {
    datasets,
    updateDataset,
    deleteDataset,
    deleteDataPoints,
    isLoading,
    setSelectedDataset,
  } = useDatasets();

  const {
    data: dataPoints = [],
    isLoading: dataPointsLoading,
    refetch: refetchDataPoints,
  } = useQuery({
    queryKey: ['dataset', datasetId, 'dataPoints'],
    queryFn: () => getDatasetDataPoints(datasetId, {}),
    enabled: !!datasetId,
  });

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDataPointsOpen, setAddDataPointsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [deleteDataPointDialogOpen, setDeleteDataPointDialogOpen] =
    useState(false);
  const [dataPointToDelete, setDataPointToDelete] = useState<DataPoint | null>(
    null,
  );

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset editing state when dataset changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: datasetId is a prop that should trigger this effect
  useEffect(() => {
    setIsEditing(false);
  }, [datasetId]);

  // Set selected dataset when component mounts or datasetId changes
  useEffect(() => {
    const dataset = datasets?.find((d) => d.id === datasetId);
    if (dataset) {
      setSelectedDataset(dataset);
    }
  }, [datasetId, datasets, setSelectedDataset]);

  const dataset = datasets?.find((d) => d.id === datasetId);

  const filteredDataPoints = useMemo(() => {
    if (!dataPoints) return undefined;

    return dataPoints.filter(
      (dp) =>
        !debouncedSearchQuery ||
        dp.endpoint
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        dp.function_name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        dp.method.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
    );
  }, [dataPoints, debouncedSearchQuery]);

  const handleSaveDataset = useCallback(
    async (data: DatasetUpdateParams) => {
      if (!dataset) return;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await updateDataset(dataset.id, data);

        if (abortController.signal.aborted) return;

        toast({
          title: 'Dataset updated',
          description: 'Dataset information has been successfully updated.',
        });

        setIsEditing(false);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;

        console.error('Failed to update dataset:', error);
        toast({
          variant: 'destructive',
          title: 'Error updating dataset',
          description: 'Please try again later',
        });
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [dataset, updateDataset, toast],
  );

  const handleDeleteDataset = useCallback(async () => {
    if (!dataset) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await deleteDataset(dataset.id);

      if (abortController.signal.aborted) return;

      toast({
        title: 'Dataset deleted',
        description: 'Dataset has been successfully deleted.',
      });

      setSelectedDataset(null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Failed to delete dataset:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting dataset',
        description: 'Please try again later',
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [dataset, deleteDataset, toast, setSelectedDataset]);

  const handleDeleteDataPoint = useCallback(async () => {
    if (!dataPointToDelete) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await deleteDataPoints(datasetId, [dataPointToDelete.id]);

      if (abortController.signal.aborted) return;

      toast({
        title: 'Data point deleted',
        description: 'Data point has been successfully deleted.',
      });

      setDeleteDataPointDialogOpen(false);
      setDataPointToDelete(null);
      refetchDataPoints();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Failed to delete data point:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting data point',
        description: 'Please try again later',
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    dataPointToDelete,
    datasetId,
    deleteDataPoints,
    toast,
    refetchDataPoints,
  ]);

  const handleBack = useCallback(() => {
    setSelectedDataset(null);
  }, [setSelectedDataset]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleOpenDeleteDataPoint = useCallback((dataPoint: DataPoint) => {
    setDataPointToDelete(dataPoint);
    setDeleteDataPointDialogOpen(true);
  }, []);

  // Loading state
  if (isLoading || (!datasets && !isLoading)) {
    return (
      <div className="p-2 h-full overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Dataset not found
  if (!dataset && datasets) {
    return (
      <div className="p-2 h-full overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Dataset not found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The dataset you're looking for doesn't exist or has been
                deleted.
              </p>
              <Button onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Datasets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Final loading check
  if (!dataset) {
    return (
      <div className="p-2 h-full overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 h-full overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <DatasetHeader
          dataset={dataset}
          isEditing={isEditing}
          isLoading={isLoading}
          onEdit={() => setIsEditing(true)}
          onSave={handleSaveDataset}
          onCancel={() => setIsEditing(false)}
          onDelete={() => setDeleteDialogOpen(true)}
          onBack={handleBack}
          showBackButton={true}
        />

        <DataPointsSection
          dataPoints={dataPoints}
          filteredDataPoints={filteredDataPoints}
          isLoading={dataPointsLoading}
          searchQuery={searchQuery}
          datasetId={datasetId}
          onSearchChange={setSearchQuery}
          onAddDataPoints={() => setAddDataPointsOpen(true)}
          onReset={handleReset}
          onDeleteDataPoint={handleOpenDeleteDataPoint}
        />

        <AddDataPointsDialog
          open={addDataPointsOpen}
          onOpenChange={setAddDataPointsOpen}
          datasetId={datasetId}
          existingDataPoints={dataPoints}
        />

        <DeleteDialogs
          dataset={dataset}
          deleteDatasetOpen={deleteDialogOpen}
          onDeleteDataset={() => setDeleteDialogOpen(true)}
          onDeleteDatasetCancel={() => setDeleteDialogOpen(false)}
          onDeleteDatasetConfirm={handleDeleteDataset}
          dataPointToDelete={dataPointToDelete}
          deleteDataPointOpen={deleteDataPointDialogOpen}
          onDeleteDataPointCancel={() => {
            setDeleteDataPointDialogOpen(false);
            setDataPointToDelete(null);
          }}
          onDeleteDataPointConfirm={handleDeleteDataPoint}
        />
      </div>
    </div>
  );
}
