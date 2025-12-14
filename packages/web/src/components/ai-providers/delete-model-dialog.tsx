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
import type { Model } from '@shared/types/data/model';
import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

interface DeleteModelDialogProps {
  model: Model | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteModelDialog({
  model,
  open,
  onOpenChange,
  onConfirm,
}: DeleteModelDialogProps): ReactElement {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputId = useId();

  const handleConfirm = async () => {
    if (!model || confirmName !== model.model_name) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmName('');
    } catch (error) {
      console.error('Error deleting model:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmName('');
    onOpenChange(false);
  };

  const isConfirmDisabled =
    !model || confirmName !== model.model_name || isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Model
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p>
              This action cannot be undone. This will permanently delete the
              model <span className="font-semibold">{model?.model_name}</span>{' '}
              and remove it from all skills that use it.
            </p>
            <div className="space-y-2">
              <Label htmlFor={inputId}>
                Type{' '}
                <span className="font-mono font-semibold">
                  {model?.model_name}
                </span>{' '}
                to confirm:
              </Label>
              <Input
                id={inputId}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Enter model name"
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
            variant={'destructive'}
          >
            {isDeleting ? 'Deleting...' : 'Delete Model'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
