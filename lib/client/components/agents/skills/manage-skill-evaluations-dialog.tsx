'use client';

import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
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
    setSkillId: setEvaluationsSkillId,
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

  // Set skill ID to trigger evaluation fetch when dialog opens
  useEffect(() => {
    if (open && skillId) {
      // Reset state before fetching
      setSelectedMethods([]);
      setInitialMethods([]);
      setEvaluationMap(new Map());
      setEvaluationsSkillId(skillId);
    } else if (!open) {
      // Clear skill ID when dialog closes
      setEvaluationsSkillId(null);
    }
  }, [open, skillId, setEvaluationsSkillId]);

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
            <CheckCircle2 size={20} />
            Manage Evaluation Methods
          </DialogTitle>
          <DialogDescription>
            Evaluations help measure and improve your skill's performance. You
            can add or remove them anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border rounded-md p-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                size={24}
                className="animate-spin text-muted-foreground"
              />
            </div>
          ) : (
            EVALUATION_METHODS.map((method) => {
              const isSelected = selectedMethods.includes(method.name);
              return (
                <Card
                  key={method.name}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleToggleMethod(method.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleToggleMethod(method.name)
                          }
                          onClick={(e) => e.stopPropagation()}
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-base font-medium cursor-pointer">
                          {method.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 mb-4">
          <Clock size={16} />
          <span>This process may take 1-2 minutes to complete.</span>
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
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
