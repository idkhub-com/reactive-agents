'use client';

import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { PageHeader } from '@client/components/ui/page-header';
import { Skeleton } from '@client/components/ui/skeleton';
import { useDebounce } from '@client/hooks/use-debounce';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import { useNavigation } from '@client/providers/navigation';
import type { DataPoint, DatasetUpdateParams } from '@shared/types/data';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddDataPointsDialog } from '../datasets-view/components/add-data-points-dialog';
import { DataPointsSection } from '../datasets-view/components/data-points-section';
import { DatasetHeader } from '../datasets-view/components/dataset-header';
import { DeleteDialogs } from '../datasets-view/components/delete-dialogs';

export function DatasetDetailView(): ReactElement {
  const { navigationState } = useNavigation();
  const smartBack = useSmartBack();
  const {
    datasets,
    dataPoints,
    dataPointsLoading,
    loadDataPoints,
    refetchDataPoints,
    updateDataset,
    deleteDataset,
    deleteDataPoints,
    isLoading: datasetsLoading,
    setSelectedDataset,
  } = useDatasets();

  const datasetId = navigationState.datasetId;

  // Find dataset from provider's datasets using useMemo to avoid infinite loops
  const dataset = useMemo(() => {
    if (!datasetId || datasets.length === 0) return null;
    return datasets.find((d) => d.id === datasetId) || null;
  }, [datasetId, datasets]);

  const datasetLoading = false;
  const datasetError =
    dataset === null && datasetId ? new Error('Dataset not found') : null;

  // Load data points when dataset is available
  useEffect(() => {
    if (datasetId) {
      loadDataPoints(datasetId, {});
    }
  }, [datasetId, loadDataPoints]);

  const handleRefetchDataPoints = useCallback(() => {
    refetchDataPoints();
  }, [refetchDataPoints]);

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
  useEffect(() => {
    setIsEditing(false);
  }, []);

  // Set selected dataset when component mounts or dataset changes
  useEffect(() => {
    if (dataset) {
      setSelectedDataset(dataset);
    }
  }, [dataset, setSelectedDataset]);

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

      // Navigate back to datasets view
      if (navigationState.selectedAgent && navigationState.selectedSkill) {
        const fallbackUrl = `/pipelines/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}/datasets`;
        smartBack(fallbackUrl);
      } else {
        smartBack('/pipelines');
      }
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
  }, [
    dataset,
    deleteDataset,
    toast,
    smartBack,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  const handleDeleteDataPoint = useCallback(async () => {
    if (!dataPointToDelete || !datasetId) return;

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
      handleRefetchDataPoints();
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
    handleRefetchDataPoints,
  ]);

  const handleBack = useCallback(() => {
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      const fallbackUrl = `/pipelines/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}/datasets`;
      smartBack(fallbackUrl);
    } else {
      smartBack('/pipelines');
    }
  }, [smartBack, navigationState.selectedAgent, navigationState.selectedSkill]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleOpenDeleteDataPoint = useCallback((dataPoint: DataPoint) => {
    setDataPointToDelete(dataPoint);
    setDeleteDataPointDialogOpen(true);
  }, []);

  // Loading state
  if (datasetLoading || datasetsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Dataset not found
  if (datasetError || !dataset) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Dataset not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The dataset you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dataset Details"
        description={dataset.name}
        showBackButton
        onBack={handleBack}
      />
      <div className="p-6 space-y-6">
        {/* Dataset Content */}
        <div className="space-y-6">
          <DatasetHeader
            dataset={dataset}
            isEditing={isEditing}
            isLoading={datasetsLoading}
            onEdit={() => setIsEditing(true)}
            onSave={handleSaveDataset}
            onCancel={() => setIsEditing(false)}
            onDelete={() => setDeleteDialogOpen(true)}
          />

          <DataPointsSection
            dataPoints={dataPoints}
            filteredDataPoints={filteredDataPoints}
            isLoading={dataPointsLoading}
            searchQuery={searchQuery}
            datasetId={datasetId!}
            onSearchChange={setSearchQuery}
            onAddDataPoints={() => setAddDataPointsOpen(true)}
            onReset={handleReset}
            onDeleteDataPoint={handleOpenDeleteDataPoint}
          />

          <AddDataPointsDialog
            open={addDataPointsOpen}
            onOpenChange={setAddDataPointsOpen}
            datasetId={datasetId!}
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
    </>
  );
}
