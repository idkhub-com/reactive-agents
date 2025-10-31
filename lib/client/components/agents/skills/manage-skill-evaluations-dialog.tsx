'use client';

import { Alert, AlertDescription } from '@client/components/ui/alert';
import { Button } from '@client/components/ui/button';
import { Checkbox } from '@client/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Label } from '@client/components/ui/label';
import { useSkillOptimizationEvaluations } from '@client/providers/skill-optimization-evaluations';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

// Only show evaluation methods that are enabled on the server
// See lib/server/api/v1/index.ts for the list of enabled connectors
const EVALUATION_METHODS = [
  {
    name: EvaluationMethodName.TASK_COMPLETION,
    label: 'Task Completion',
    description:
      'Evaluates whether the AI successfully completed the requested task',
  },
  {
    name: EvaluationMethodName.TURN_RELEVANCY,
    label: 'Turn Relevancy',
    description:
      'Assesses whether responses are relevant to the conversation context',
  },
  {
    name: EvaluationMethodName.TOOL_CORRECTNESS,
    label: 'Tool Correctness',
    description:
      'Validates that tools are used appropriately and produce correct results',
  },
  {
    name: EvaluationMethodName.KNOWLEDGE_RETENTION,
    label: 'Knowledge Retention',
    description:
      'Evaluates how well the AI retains and recalls information from previous interactions',
  },
  {
    name: EvaluationMethodName.CONVERSATION_COMPLETENESS,
    label: 'Conversation Completeness',
    description:
      'Assesses whether conversations are properly concluded and all topics are addressed',
  },
];

interface ManageSkillEvaluationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillId: string;
}

export function ManageSkillEvaluationsDialog({
  open,
  onOpenChange,
  skillId,
}: ManageSkillEvaluationsDialogProps): ReactElement {
  const queryClient = useQueryClient();
  const {
    evaluations,
    fetchEvaluations,
    createEvaluation,
    deleteEvaluation,
    isCreating,
    isDeleting,
    isLoading,
  } = useSkillOptimizationEvaluations();

  const [initialMethods, setInitialMethods] = useState<EvaluationMethodName[]>(
    [],
  );
  const [selectedMethods, setSelectedMethods] = useState<
    EvaluationMethodName[]
  >([]);
  const [evaluationMap, setEvaluationMap] = useState<
    Map<EvaluationMethodName, SkillOptimizationEvaluation>
  >(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch evaluations when dialog opens
  useEffect(() => {
    if (open && skillId) {
      // Reset state before fetching
      setSelectedMethods([]);
      setInitialMethods([]);
      setEvaluationMap(new Map());
      fetchEvaluations(skillId);
    }
  }, [open, skillId, fetchEvaluations]);

  // Update selected methods and map when evaluations change
  useEffect(() => {
    if (!open) return; // Only update when dialog is open

    console.log('ManageEvaluationsDialog - Updating from evaluations:', {
      evaluationsCount: evaluations.length,
      evaluations: evaluations.map((e) => e.evaluation_method),
    });

    const map = new Map<EvaluationMethodName, SkillOptimizationEvaluation>();
    const methods: EvaluationMethodName[] = [];

    for (const evaluation of evaluations) {
      map.set(evaluation.evaluation_method, evaluation);
      methods.push(evaluation.evaluation_method);
    }

    console.log('ManageEvaluationsDialog - Setting selected methods:', methods);
    setEvaluationMap(map);
    setSelectedMethods(methods);
    setInitialMethods(methods);
  }, [evaluations, open]);

  const handleToggleMethod = (method: EvaluationMethodName) => {
    const isCurrentlySelected = selectedMethods.includes(method);

    if (isCurrentlySelected) {
      setSelectedMethods((prev) => prev.filter((m) => m !== method));
    } else {
      setSelectedMethods((prev) => [...prev, method]);
    }
  };

  const handleAccept = async () => {
    setIsSaving(true);
    try {
      // Determine what to add and what to remove
      const methodsToAdd = selectedMethods.filter(
        (method) => !initialMethods.includes(method),
      );
      const methodsToRemove = initialMethods.filter(
        (method) => !selectedMethods.includes(method),
      );

      // Delete evaluations that were removed
      const deletePromises = methodsToRemove.map(async (method) => {
        const evaluation = evaluationMap.get(method);
        if (evaluation) {
          await deleteEvaluation(skillId, evaluation.id);
        }
      });

      // Create evaluations that were added
      const createPromises =
        methodsToAdd.length > 0
          ? [createEvaluation(skillId, methodsToAdd)]
          : [];

      // Execute all operations in parallel
      await Promise.all([...deletePromises, ...createPromises]);

      // Invalidate the skill validation cache to refresh the UI
      await queryClient.invalidateQueries({
        queryKey: ['skill-validation-evaluations', skillId],
      });

      // Close dialog on success
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save evaluation changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to initial state
    setSelectedMethods(initialMethods);
    onOpenChange(false);
  };

  const hasChanges =
    JSON.stringify([...selectedMethods].sort()) !==
    JSON.stringify([...initialMethods].sort());

  const isProcessing = isCreating || isDeleting || isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Manage Evaluation Methods
          </DialogTitle>
          <DialogDescription>
            Select which evaluation methods to apply to your skill. Toggle any
            method to add or remove it.
          </DialogDescription>
        </DialogHeader>

        <Alert className="my-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Adding new evaluation methods may take some time as the AI generates
            evaluation parameters for your skill. Please be patient while the
            system processes your changes.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            EVALUATION_METHODS.map((method) => {
              const isSelected = selectedMethods.includes(method.name);
              return (
                <button
                  key={method.name}
                  type="button"
                  className={`border rounded-lg p-4 cursor-pointer transition-all text-left w-full ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleToggleMethod(method.name)}
                  disabled={isProcessing}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleMethod(method.name)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isProcessing}
                    />
                    <div className="flex-1">
                      <Label className="text-base font-medium cursor-pointer">
                        {method.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={!hasChanges || isProcessing}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Accept'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
