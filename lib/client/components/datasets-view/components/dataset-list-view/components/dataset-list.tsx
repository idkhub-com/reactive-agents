import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/alert-dialog';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import type { Dataset } from '@shared/types/data';
import { Database, MoreVertical, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DatasetListProps {
  datasets: Dataset[];
}

export function DatasetList({
  datasets,
}: DatasetListProps): React.ReactElement {
  const { deleteDataset } = useDatasets();
  const { toast } = useToast();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);

  const handleDatasetClick = (dataset: Dataset) => {
    router.push(`/datasets/${dataset.id}`);
  };

  const handleDeleteClick = (dataset: Dataset, event: React.MouseEvent) => {
    event.stopPropagation();
    setDatasetToDelete(dataset);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!datasetToDelete) return;

    try {
      await deleteDataset(datasetToDelete.id);
      toast({
        title: 'Dataset deleted',
        description: `Successfully deleted ${datasetToDelete.name}`,
      });
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting dataset',
        description: 'Please try again later',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <>
      <div className="space-y-4 overflow-auto">
        {datasets.map((dataset) => (
          <Card
            key={dataset.id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => handleDatasetClick(dataset)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="shrink-0 mt-1">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-sm truncate">
                        {dataset.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {Object.keys(dataset.metadata).length} metadata
                      </Badge>
                    </div>
                    {dataset.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {dataset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {formatDate(dataset.created_at)}</span>
                      {dataset.updated_at !== dataset.created_at && (
                        <span>Updated {formatDate(dataset.updated_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(dataset, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Dataset
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{datasetToDelete?.name}"? This
              action cannot be undone. All data points in this dataset will also
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
