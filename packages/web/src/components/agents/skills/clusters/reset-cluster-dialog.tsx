'use client';

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
import { Checkbox } from '@client/components/ui/checkbox';
import { Label } from '@client/components/ui/label';
import type { SkillOptimizationCluster } from '@shared/types/data';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

interface ResetClusterDialogProps {
  cluster: SkillOptimizationCluster | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clearObservabilityCount: boolean) => void | Promise<void>;
  isResetting?: boolean;
}

export function ResetClusterDialog({
  cluster,
  open,
  onOpenChange,
  onConfirm,
  isResetting = false,
}: ResetClusterDialogProps): ReactElement {
  const [clearObservabilityCount, setClearObservabilityCount] = useState(false);
  const checkboxId = useId();

  const handleConfirm = async () => {
    await onConfirm(clearObservabilityCount);
    onOpenChange(false);
    setClearObservabilityCount(false); // Reset checkbox for next time
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Partition</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to reset partition{' '}
                <span className="font-semibold text-foreground">
                  {cluster?.name}
                </span>
                ?
              </p>
              <p className="font-medium text-foreground">This will:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Delete all configurations</li>
                <li>Reset learning progress</li>
                <li>
                  {clearObservabilityCount
                    ? 'Reset observability request count'
                    : 'Keep observability request count'}
                </li>
              </ul>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={checkboxId}
                  checked={clearObservabilityCount}
                  onCheckedChange={(checked) =>
                    setClearObservabilityCount(checked === true)
                  }
                />
                <Label
                  htmlFor={checkboxId}
                  className="text-sm font-normal cursor-pointer"
                >
                  Also reset observability request count
                </Label>
              </div>
              <p className="text-sm">
                The partition will be regenerated with fresh configurations.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isResetting}
            variant={'destructive'}
          >
            {isResetting ? 'Resetting...' : 'Reset Partition'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
