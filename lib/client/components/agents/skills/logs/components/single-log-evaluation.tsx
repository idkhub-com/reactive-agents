'use client';

import {
  executeSingleLogEvaluation,
  getEvaluationMethodSchema,
  getEvaluationMethods,
} from '@client/api/v1/idk/evaluations';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/components/ui/dialog';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@client/components/ui/radio-group';
import { Skeleton } from '@client/components/ui/skeleton';
import { Textarea } from '@client/components/ui/textarea';
import { toast } from '@client/hooks/use-toast';
import { useNavigation } from '@client/providers/navigation';
import type {
  EvaluationMethodDetails,
  EvaluationMethodName,
  SingleLogEvaluationRequest,
} from '@shared/types/idkhub/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PlayIcon,
  SettingsIcon,
  TestTubeIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';

interface SingleLogEvaluationFormData {
  evaluationMethod: string;
  configuration: Record<string, string | number | boolean>;
}

interface EvaluationMethodWithSchema extends EvaluationMethodDetails {
  schema?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
}

interface EvaluationResults {
  evaluation_run_id: string;
  status: string;
  message: string;
  results?: Record<string, unknown>;
}

interface SingleLogEvaluationProps {
  log: IdkRequestLog;
}

export function SingleLogEvaluation({
  log,
}: SingleLogEvaluationProps): ReactElement {
  const { navigationState } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('select-method');
  const [evaluationResults, setEvaluationResults] =
    useState<EvaluationResults | null>(null);

  const [formData, setFormData] = useState<SingleLogEvaluationFormData>({
    evaluationMethod: '',
    configuration: {},
  });

  const [evaluationMethods, setEvaluationMethods] = useState<
    EvaluationMethodWithSchema[]
  >([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Load evaluation methods on component mount
  useEffect(() => {
    const loadMethods = async () => {
      try {
        setIsLoadingMethods(true);
        const methods = await getEvaluationMethods();
        setEvaluationMethods(methods);
      } catch (error) {
        console.error('Failed to load evaluation methods:', error);
        toast({
          title: 'Error',
          description: 'Failed to load evaluation methods',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingMethods(false);
      }
    };

    if (isOpen) {
      loadMethods();
    }
  }, [isOpen]);

  // Load schema when method is selected
  useEffect(() => {
    const loadSchema = async () => {
      if (!formData.evaluationMethod) return;

      try {
        const schema = await getEvaluationMethodSchema(
          formData.evaluationMethod as EvaluationMethodName,
        );

        setEvaluationMethods((prev) =>
          prev.map((method) =>
            method.method === formData.evaluationMethod
              ? { ...method, schema }
              : method,
          ),
        );

        // Set default configuration values
        if (schema && typeof schema === 'object' && 'properties' in schema) {
          const defaults: Record<string, string | number | boolean> = {};
          const properties = schema.properties as Record<
            string,
            { default?: unknown }
          >;

          for (const [key, prop] of Object.entries(properties)) {
            if (prop && typeof prop === 'object' && 'default' in prop) {
              const defaultValue = prop.default;
              if (
                typeof defaultValue === 'string' ||
                typeof defaultValue === 'number' ||
                typeof defaultValue === 'boolean'
              ) {
                defaults[key] = defaultValue;
              }
            }
          }

          setFormData((prev) => ({
            ...prev,
            configuration: { ...defaults, ...prev.configuration },
          }));
        }
      } catch (error) {
        console.error('Failed to load schema:', error);
        toast({
          title: 'Error',
          description: 'Failed to load method configuration',
          variant: 'destructive',
        });
      }
    };

    loadSchema();
  }, [formData.evaluationMethod]);

  const handleExecuteEvaluation = useCallback(async () => {
    if (!navigationState.selectedAgent) {
      toast({
        title: 'Error',
        description: 'No agent selected',
        variant: 'destructive',
      });
      return;
    }

    setIsExecuting(true);
    try {
      const request: SingleLogEvaluationRequest = {
        agent_id: navigationState.selectedAgent.id,
        log_id: log.id,
        evaluation_method: formData.evaluationMethod as EvaluationMethodName,
        parameters: formData.configuration,
        name: `Single Log Evaluation - ${formData.evaluationMethod}`,
        description: `Single log evaluation for log ${log.id}`,
      };

      const results = await executeSingleLogEvaluation(request);
      setEvaluationResults(results);
      setCurrentStep('results');

      toast({
        title: 'Success',
        description: 'Single log evaluation completed successfully',
      });
    } catch (error) {
      console.error('Failed to execute evaluation:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute single log evaluation',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [navigationState.selectedAgent, log.id, formData]);

  const resetDialog = () => {
    setCurrentStep('select-method');
    setFormData({
      evaluationMethod: '',
      configuration: {},
    });
    setEvaluationResults(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetDialog();
    }
  };

  const selectedMethod = evaluationMethods.find(
    (m) => m.method === formData.evaluationMethod,
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-method':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Evaluation Method</CardTitle>
              <CardDescription>
                Choose an evaluation method to run on this log
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMethods ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={formData.evaluationMethod}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      evaluationMethod: value,
                    }))
                  }
                  className="space-y-4"
                >
                  {evaluationMethods.map((method) => (
                    <div
                      key={method.method}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem
                        value={method.method}
                        id={method.method}
                      />
                      <Label
                        htmlFor={method.method}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{method.name}</span>
                            <Badge variant="secondary">{method.method}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {method.description}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        );

      case 'configure':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configure Evaluation</CardTitle>
              <CardDescription>
                Set parameters for {selectedMethod?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedMethod?.schema &&
                typeof selectedMethod.schema === 'object' &&
                'properties' in selectedMethod.schema && (
                  <div className="space-y-4">
                    {Object.entries(
                      selectedMethod.schema.properties as Record<
                        string,
                        {
                          type?: string;
                          description?: string;
                          default?: unknown;
                          minimum?: number;
                          maximum?: number;
                        }
                      >,
                    ).map(([key, prop]) => {
                      const currentValue = formData.configuration[key];

                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Label>
                          {prop.type === 'boolean' ? (
                            <RadioGroup
                              value={String(
                                currentValue ?? prop.default ?? false,
                              )}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  configuration: {
                                    ...prev.configuration,
                                    [key]: value === 'true',
                                  },
                                }))
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="true"
                                  id={`${key}-true`}
                                />
                                <Label htmlFor={`${key}-true`}>True</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="false"
                                  id={`${key}-false`}
                                />
                                <Label htmlFor={`${key}-false`}>False</Label>
                              </div>
                            </RadioGroup>
                          ) : prop.type === 'string' &&
                            key.includes('description') ? (
                            <Textarea
                              id={key}
                              value={String(currentValue ?? prop.default ?? '')}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  configuration: {
                                    ...prev.configuration,
                                    [key]: e.target.value,
                                  },
                                }))
                              }
                              placeholder={prop.description}
                            />
                          ) : (
                            <Input
                              id={key}
                              type={prop.type === 'number' ? 'number' : 'text'}
                              value={String(currentValue ?? prop.default ?? '')}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  configuration: {
                                    ...prev.configuration,
                                    [key]:
                                      prop.type === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  },
                                }))
                              }
                              placeholder={prop.description}
                              min={prop.minimum}
                              max={prop.maximum}
                            />
                          )}
                          {prop.description && (
                            <p className="text-sm text-muted-foreground">
                              {prop.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
        );

      case 'results':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Results</CardTitle>
              <CardDescription>
                Single log evaluation completed successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {evaluationResults && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">
                      {evaluationResults.message}
                    </span>
                  </div>

                  {evaluationResults.results && (
                    <div className="space-y-2">
                      <Label>Results</Label>
                      <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-60">
                        {JSON.stringify(evaluationResults.results, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Evaluation Run ID</Label>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {evaluationResults.evaluation_run_id}
                    </code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'select-method':
        return 1;
      case 'configure':
        return 2;
      case 'results':
        return 3;
      default:
        return 1;
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'select-method':
        return formData.evaluationMethod !== '';
      case 'configure':
        return true; // Allow proceeding with default configuration
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    switch (currentStep) {
      case 'select-method':
        setCurrentStep('configure');
        break;
      case 'configure':
        handleExecuteEvaluation();
        break;
    }
  };

  const handlePrevStep = () => {
    switch (currentStep) {
      case 'configure':
        setCurrentStep('select-method');
        break;
      case 'results':
        setCurrentStep('configure');
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TestTubeIcon className="h-4 w-4" />
          Evaluate Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTubeIcon className="h-5 w-5" />
            Single Log Evaluation
          </DialogTitle>
          <DialogDescription>
            Run evaluations on this specific log: {log.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  getStepProgress() >= 1
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground'
                }`}
              >
                1
              </div>
              <span className="text-sm">Method</span>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  getStepProgress() >= 2
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground'
                }`}
              >
                {getStepProgress() >= 2 ? (
                  <SettingsIcon className="h-4 w-4" />
                ) : (
                  '2'
                )}
              </div>
              <span className="text-sm">Configure</span>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  getStepProgress() >= 3
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground'
                }`}
              >
                {getStepProgress() >= 3 ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm">Results</span>
            </div>
          </div>

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 'select-method' || isExecuting}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              {currentStep !== 'results' && (
                <Button
                  onClick={handleNextStep}
                  disabled={!canProceedToNextStep() || isExecuting}
                  className="gap-2"
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Evaluating...
                    </>
                  ) : currentStep === 'configure' ? (
                    <>
                      <PlayIcon className="h-4 w-4" />
                      Execute
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              {currentStep === 'results' && (
                <Button onClick={() => setIsOpen(false)}>Close</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
