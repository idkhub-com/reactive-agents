import { getDatasetLogs } from '@client/api/v1/idk/evaluations/datasets';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { Skeleton } from '@client/components/ui/skeleton';
import { useDebounce } from '@client/hooks/use-debounce';
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import type { DatasetUpdateParams, Log } from '@shared/types/data';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddLogsDialog } from './components/add-logs-dialog';
import { DatasetHeader } from './components/dataset-header';
import { DeleteDialogs } from './components/delete-dialogs';
import { LogsSection } from './components/logs-section';

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
    deleteLogs,
    isLoading,
    setSelectedDataset,
  } = useDatasets();

  const {
    data: logs = [],
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['dataset', datasetId, 'logs'],
    queryFn: () => getDatasetLogs(datasetId, { limit: 50, offset: 0 }),
    enabled: !!datasetId,
  });

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addLogsOpen, setAddLogsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [deleteLogDialogOpen, setDeleteLogDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<Log | null>(null);

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

  const filteredLogs = useMemo(() => {
    if (!logs) return undefined;

    return logs.filter(
      (log) =>
        !debouncedSearchQuery ||
        log.endpoint
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        log.function_name
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        log.method?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
    );
  }, [logs, debouncedSearchQuery]);

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

  const handleDeleteLog = useCallback(async () => {
    if (!logToDelete) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await deleteLogs(datasetId, [logToDelete.id]);

      if (abortController.signal.aborted) return;

      toast({
        title: 'Log deleted',
        description: 'Log has been successfully deleted.',
      });

      setDeleteLogDialogOpen(false);
      setLogToDelete(null);
      refetchLogs();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Failed to delete log:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting log',
        description: 'Please try again later',
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [logToDelete, datasetId, deleteLogs, toast, refetchLogs]);

  const handleBack = useCallback(() => {
    setSelectedDataset(null);
  }, [setSelectedDataset]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleOpenDeleteLog = useCallback((log: Log) => {
    setLogToDelete(log);
    setDeleteLogDialogOpen(true);
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

        <LogsSection
          logs={logs}
          filteredLogs={filteredLogs}
          isLoading={logsLoading}
          searchQuery={searchQuery}
          datasetId={datasetId}
          onSearchChange={setSearchQuery}
          onAddLogs={() => setAddLogsOpen(true)}
          onReset={handleReset}
          onDeleteLog={handleOpenDeleteLog}
        />

        <AddLogsDialog
          open={addLogsOpen}
          onOpenChange={setAddLogsOpen}
          datasetId={datasetId}
          existingLogs={logs}
        />

        <DeleteDialogs
          dataset={dataset}
          deleteDatasetOpen={deleteDialogOpen}
          onDeleteDataset={() => setDeleteDialogOpen(true)}
          onDeleteDatasetCancel={() => setDeleteDialogOpen(false)}
          onDeleteDatasetConfirm={handleDeleteDataset}
          logToDelete={logToDelete}
          deleteLogOpen={deleteLogDialogOpen}
          onDeleteLogCancel={() => {
            setDeleteLogDialogOpen(false);
            setLogToDelete(null);
          }}
          onDeleteLogConfirm={handleDeleteLog}
        />
      </div>
    </div>
  );
}
