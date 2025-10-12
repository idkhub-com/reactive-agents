'use client';

import { Alert, AlertDescription } from '@client/components/ui/alert';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Checkbox } from '@client/components/ui/checkbox';
import { Label } from '@client/components/ui/label';
import { PageHeader } from '@client/components/ui/page-header';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationEvaluations } from '@client/providers/skill-optimization-evaluations';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useState } from 'react';

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

export function CreateSkillEvaluationsView(): ReactElement {
  const { navigationState } = useNavigation();
  const { createEvaluation, isCreating } = useSkillOptimizationEvaluations();
  const router = useRouter();
  const [selectedMethods, setSelectedMethods] = useState<
    EvaluationMethodName[]
  >([]);

  const handleToggleMethod = (method: EvaluationMethodName) => {
    setSelectedMethods((prev) => {
      if (prev.includes(method)) {
        return prev.filter((m) => m !== method);
      }
      return [...prev, method];
    });
  };

  const handleSubmit = async () => {
    if (!navigationState.selectedSkill || selectedMethods.length === 0) {
      return;
    }

    try {
      await createEvaluation(navigationState.selectedSkill.id, selectedMethods);

      // Navigate to skill dashboard
      if (navigationState.selectedAgent && navigationState.selectedSkill) {
        router.push(
          `/agents/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}`,
        );
      }
    } catch (error) {
      console.error('Failed to create evaluations:', error);
    }
  };

  const handleSkip = () => {
    // Navigate to skill dashboard without creating evaluations
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      router.push(
        `/agents/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}`,
      );
    }
  };

  if (!navigationState.selectedAgent || !navigationState.selectedSkill) {
    return (
      <>
        <PageHeader
          title="Add Evaluations"
          description="Select evaluation methods for your skill"
          showBackButton={false}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              No skill selected. Please create a skill first.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add Evaluations"
        description={`Select evaluation methods for ${navigationState.selectedSkill.name}`}
        onBack={handleSkip}
      />
      <div className="container mx-auto py-6 max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Select Evaluation Methods
            </CardTitle>
            <CardDescription>
              Choose which evaluation methods to apply to your skill. You can
              add more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Adding evaluation methods may take some time as the AI generates
                evaluation parameters for your skill. Please be patient while
                the system processes your selections.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {EVALUATION_METHODS.map((method) => (
                <Card
                  key={method.name}
                  className={`cursor-pointer transition-all ${
                    selectedMethods.includes(method.name)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleToggleMethod(method.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedMethods.includes(method.name)}
                        onCheckedChange={() => handleToggleMethod(method.name)}
                        onClick={(e) => e.stopPropagation()}
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
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleSkip}
                disabled={isCreating}
                className="flex-1"
              >
                Skip for now
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={handleSubmit}
                disabled={isCreating || selectedMethods.length === 0}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Evaluations...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Add{' '}
                    {selectedMethods.length > 0 &&
                      `(${selectedMethods.length})`}{' '}
                    Evaluation
                    {selectedMethods.length !== 1 && 's'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              About Skill Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Evaluations help you measure and improve your skill's
                  performance over time
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Each method evaluates different aspects of your AI's behavior
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  You can add, remove, or modify evaluations at any time from
                  the skill dashboard
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
