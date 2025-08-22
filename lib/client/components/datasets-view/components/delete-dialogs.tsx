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
import type { DataPoint, Dataset } from '@shared/types/data';
import { AlertTriangle } from 'lucide-react';

interface DeleteDialogsProps {
  // Dataset deletion
  dataset: Dataset | null;
  deleteDatasetOpen: boolean;
  onDeleteDataset: () => void;
  onDeleteDatasetCancel: () => void;
  onDeleteDatasetConfirm: () => void;

  // Data point deletion
  dataPointToDelete: DataPoint | null;
  deleteDataPointOpen: boolean;
  onDeleteDataPointCancel: () => void;
  onDeleteDataPointConfirm: () => void;
}

export function DeleteDialogs({
  dataset,
  deleteDatasetOpen,
  onDeleteDatasetCancel,
  onDeleteDatasetConfirm,
  dataPointToDelete,
  deleteDataPointOpen,
  onDeleteDataPointCancel,
  onDeleteDataPointConfirm,
}: DeleteDialogsProps): React.ReactElement {
  return (
    <>
      {/* Dataset Delete Dialog */}
      <AlertDialog
        open={deleteDatasetOpen}
        onOpenChange={onDeleteDatasetCancel}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Dataset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{dataset?.name}"? This action
              cannot be undone and will permanently remove the dataset and all
              its data points.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDeleteDatasetCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteDatasetConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Dataset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Data Point Delete Dialog */}
      <AlertDialog
        open={deleteDataPointOpen}
        onOpenChange={onDeleteDataPointCancel}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Data Point
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this data point for "
              {dataPointToDelete?.endpoint}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDeleteDataPointCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteDataPointConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Data Point
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
