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
import type { Skill } from '@shared/types/data';
import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

interface DeleteSkillDialogProps {
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteSkillDialog({
  skill,
  open,
  onOpenChange,
  onConfirm,
}: DeleteSkillDialogProps): ReactElement {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputId = useId();

  const handleConfirm = async () => {
    if (!skill || confirmName !== skill.name) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmName('');
    } catch (error) {
      console.error('Error deleting skill:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmName('');
    onOpenChange(false);
  };

  const isConfirmDisabled = !skill || confirmName !== skill.name || isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Skill
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p>
              This action cannot be undone. This will permanently delete the
              skill <span className="font-semibold">{skill?.name}</span> and all
              of its data.
            </p>
            <div className="space-y-2">
              <Label htmlFor={inputId}>
                Type{' '}
                <span className="font-mono font-semibold">{skill?.name}</span>{' '}
                to confirm:
              </Label>
              <Input
                id={inputId}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Enter skill name"
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
            {isDeleting ? 'Deleting...' : 'Delete Skill'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
