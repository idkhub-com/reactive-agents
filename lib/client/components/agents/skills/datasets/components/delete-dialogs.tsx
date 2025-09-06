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
import type { Dataset, Log } from '@shared/types/data';
import { AlertTriangle } from 'lucide-react';

interface DeleteDialogsProps {
  // Dataset deletion
  dataset: Dataset | null;
  deleteDatasetOpen: boolean;
  onDeleteDataset: () => void;
  onDeleteDatasetCancel: () => void;
  onDeleteDatasetConfirm: () => void;

  // Log deletion
  logToDelete?: Log | null;
  deleteLogOpen?: boolean;
  onDeleteLogCancel?: () => void;
  onDeleteLogConfirm?: () => void;
}

export function DeleteDialogs({
  dataset,
  deleteDatasetOpen,
  onDeleteDatasetCancel,
  onDeleteDatasetConfirm,
  logToDelete,
  deleteLogOpen,
  onDeleteLogCancel,
  onDeleteLogConfirm,
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
              its logs.
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

      {/* Log Delete Dialog */}
      {deleteLogOpen && (
        <AlertDialog open={deleteLogOpen} onOpenChange={onDeleteLogCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Log
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this log for "
                {logToDelete?.endpoint}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onDeleteLogCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteLogConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Log
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
