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
import type { AIProviderConfig } from '@shared/types/data/ai-provider';
import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

interface DeleteAIProviderDialogProps {
  provider: AIProviderConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAIProviderDialog({
  provider,
  open,
  onOpenChange,
  onConfirm,
}: DeleteAIProviderDialogProps): ReactElement {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputId = useId();

  const handleConfirm = async () => {
    if (!provider || confirmName !== provider.name) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmName('');
    } catch (error) {
      console.error('Error deleting AI provider:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmName('');
    onOpenChange(false);
  };

  const isConfirmDisabled =
    !provider || confirmName !== provider.name || isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete AI Provider
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p>
              This action cannot be undone. This will permanently delete the AI
              provider <span className="font-semibold">{provider?.name}</span>{' '}
              and all models associated with it.
            </p>
            <div className="space-y-2">
              <Label htmlFor={inputId}>
                Type{' '}
                <span className="font-mono font-semibold">
                  {provider?.name}
                </span>{' '}
                to confirm:
              </Label>
              <Input
                id={inputId}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Enter provider name"
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
            {isDeleting ? 'Deleting...' : 'Delete Provider'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
