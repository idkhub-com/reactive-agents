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
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import type { Agent } from '@shared/types/data';
import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

interface DeleteAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAgentDialog({
  agent,
  open,
  onOpenChange,
  onConfirm,
}: DeleteAgentDialogProps): ReactElement {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputId = useId();

  const handleConfirm = async () => {
    if (!agent || confirmName !== agent.name) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmName('');
    } catch (error) {
      console.error('Error deleting agent:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmName('');
    onOpenChange(false);
  };

  const isConfirmDisabled = !agent || confirmName !== agent.name || isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Agent
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p>
              This action cannot be undone. This will permanently delete the
              agent <span className="font-semibold">{agent?.name}</span> and all
              of its skills.
            </p>
            <div className="space-y-2">
              <Label htmlFor={inputId}>
                Type{' '}
                <span className="font-mono font-semibold">{agent?.name}</span>{' '}
                to confirm:
              </Label>
              <Input
                id={inputId}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Enter agent name"
                className="font-mono"
                disabled={isDeleting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isConfirmDisabled) {
                    handleConfirm();
                  }
                }}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Agent'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
