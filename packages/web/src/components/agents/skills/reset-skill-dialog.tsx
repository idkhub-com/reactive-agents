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
import type { Skill } from '@shared/types/data';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

interface ResetSkillDialogProps {
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clearObservabilityCount: boolean) => void | Promise<void>;
  isResetting?: boolean;
}

export function ResetSkillDialog({
  skill,
  open,
  onOpenChange,
  onConfirm,
  isResetting = false,
}: ResetSkillDialogProps): ReactElement {
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
          <AlertDialogTitle>Reset Skill Optimization</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to reset{' '}
                <span className="font-semibold text-foreground">
                  {skill?.name}
                </span>
                ?
              </p>
              <p className="font-medium text-foreground">This will:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Delete all partitions and configurations</li>
                <li>Delete all evaluations</li>
                <li>Reset all learning progress</li>
                <li>
                  {clearObservabilityCount
                    ? 'Reset skill observability request counts'
                    : 'Keep skill observability request counts'}
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
                  Also reset observability request counts
                </Label>
              </div>
              <p className="text-sm font-medium text-destructive">
                Everything will be regenerated from scratch. This action cannot
                be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            variant={'destructive'}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Skill'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
