'use client';

import {
  executeEvaluation,
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
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { PageHeader } from '@client/components/ui/page-header';
import { RadioGroup, RadioGroupItem } from '@client/components/ui/radio-group';
import { Skeleton } from '@client/components/ui/skeleton';
import { Textarea } from '@client/components/ui/textarea';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { toast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useNavigation } from '@client/providers/navigation';
import type {
  EvaluationMethodDetails,
  EvaluationMethodName,
  EvaluationMethodParameters,
} from '@shared/types/idkhub/evaluations';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DatabaseIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  XIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

interface EvaluationFormData {
  name: string;
  description: string;
  datasetId: string;
  evaluationMethod: string;
  configuration: Record<string, string | number | boolean>;
}

interface JSONSchemaProperty {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchemaProperty>;
  default?: Record<string, unknown>;
}

interface EvaluationMethodWithSchema extends EvaluationMethodDetails {
  schema?: JSONSchema;
  defaults?: Record<string, unknown>;
}

export function CreateEvaluationRunView(): ReactElement {
  const { navigationState, replaceToEvaluations } = useNavigation();
  const smartBack = useSmartBack();

  // Use providers
  const {
    datasets,
    isLoading: isLoadingDatasets,
    setQueryParams: setDatasetQueryParams,
  } = useDatasets();
  const { refetch } = useEvaluationRuns();
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<EvaluationFormData>({
    name: '',
    description: '',
    datasetId: '',
    evaluationMethod: '',
    configuration: {},
  });

  const [currentStep, setCurrentStep] = useState<string>('select-dataset');
  const [evaluationMethods, setEvaluationMethods] = useState<
    EvaluationMethodWithSchema[]
  >([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [shownOptionalParams, setShownOptionalParams] = useState<Set<string>>(
    new Set(),
  );

  // Update dataset query params when agent changes
  useEffect(() => {
    if (navigationState.selectedAgent) {
      setDatasetQueryParams({
        agent_id: navigationState.selectedAgent.id,
        limit: 100,
      });
    }
  }, [navigationState.selectedAgent, setDatasetQueryParams]);

  // Load evaluation methods on component mount
  useEffect(() => {
    const loadEvaluationMethods = async () => {
      try {
        setIsLoadingMethods(true);
        const methods = await getEvaluationMethods();

        // Load schemas for each method
        const methodsWithSchemas = await Promise.all(
          methods.map(async (method) => {
            try {
              const schema = await getEvaluationMethodSchema(method.method);
              return {
                ...method,
                schema: schema,
                defaults: (schema.default as Record<string, unknown>) || {},
              };
            } catch (error) {
              console.error(
                `Failed to load schema for ${method.method}:`,
                error,
              );
              return method;
            }
          }),
        );

        setEvaluationMethods(methodsWithSchemas);
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

    loadEvaluationMethods();
  }, []);

  // Early return if no skill or agent selected - AFTER all hooks
  if (!navigationState.selectedSkill || !navigationState.selectedAgent) {
    return <div>No skill selected</div>;
  }

  const { selectedSkill, selectedAgent } = navigationState;

  const handleBack = () => {
    switch (currentStep) {
      case 'select-dataset': {
        // Use smart back navigation for the first step
        const fallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}/evaluations`;
        smartBack(fallbackUrl);
        break;
      }
      case 'select-method':
        setCurrentStep('select-dataset');
        break;
      case 'configure':
        setCurrentStep('select-method');
        break;
      case 'review':
        setCurrentStep('configure');
        break;
      default: {
        // Use smart back for any unknown state
        const defaultFallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}/evaluations`;
        smartBack(defaultFallbackUrl);
      }
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'select-dataset':
        if (formData.datasetId) {
          setCurrentStep('select-method');
        }
        break;
      case 'select-method':
        if (formData.evaluationMethod) {
          // Clear optional parameters when changing methods
          setShownOptionalParams(new Set());
          setCurrentStep('configure');
        }
        break;
      case 'configure':
        setCurrentStep('review');
        break;
      case 'review':
        handleSubmit();
        break;
    }
  };

  const handleSubmit = async () => {
    try {
      setIsCreating(true);

      const result = await executeEvaluation({
        agent_id: selectedAgent.id,
        skill_id: selectedSkill.id,
        dataset_id: formData.datasetId,
        evaluation_method: formData.evaluationMethod as EvaluationMethodName,
        parameters: formData.configuration as EvaluationMethodParameters,
        name: formData.name,
        description: formData.description,
      });

      toast({
        title: 'Evaluation Started',
        description: `Evaluation "${formData.name}" has been executed successfully. Results: ${result.message}`,
      });

      // Refresh the evaluations list and replace history back to evaluations
      refetch();
      replaceToEvaluations(selectedAgent.name, selectedSkill.name);
    } catch (error) {
      console.error('Failed to execute evaluation:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute evaluation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateFormData = (updates: Partial<EvaluationFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const showOptionalParam = (paramKey: string) => {
    setShownOptionalParams((prev) => new Set(prev).add(paramKey));
  };

  const hideOptionalParam = (paramKey: string) => {
    setShownOptionalParams((prev) => {
      const newSet = new Set(prev);
      newSet.delete(paramKey);
      return newSet;
    });
    // Also remove the parameter from configuration
    const newConfig = { ...formData.configuration };
    delete newConfig[paramKey];
    updateFormData({
      configuration: newConfig,
    });
  };

  const selectedDataset = datasets.find((d) => d.id === formData.datasetId);
  const selectedMethod = evaluationMethods.find(
    (m) => m.method === formData.evaluationMethod,
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-dataset':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Dataset</CardTitle>
              <CardDescription>
                Choose a dataset to evaluate against
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDatasets ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-16 w-full" />
                  ))}
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-8">
                  <DatabaseIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No datasets available
                  </h3>
                  <p className="text-muted-foreground">
                    Create a dataset first before running evaluations.
                  </p>
                </div>
              ) : (
                <RadioGroup
                  value={formData.datasetId}
                  onValueChange={(value: string) =>
                    updateFormData({ datasetId: value })
                  }
                  className="space-y-4"
                >
                  {datasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className="flex items-center space-x-2 p-4 border rounded-lg"
                    >
                      <RadioGroupItem value={dataset.id} id={dataset.id} />
                      <div className="flex-1">
                        <Label
                          htmlFor={dataset.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {dataset.name}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dataset.description || 'No description'}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          Dataset
                        </Badge>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        );

      case 'select-method':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Evaluation Method</CardTitle>
              <CardDescription>
                Choose how you want to evaluate the model performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMethods ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map(() => (
                    <Skeleton key={nanoid()} className="h-16 w-full" />
                  ))}
                </div>
              ) : evaluationMethods.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">
                    No evaluation methods available
                  </h3>
                  <p className="text-muted-foreground">
                    Unable to load evaluation methods.
                  </p>
                </div>
              ) : (
                <RadioGroup
                  value={formData.evaluationMethod}
                  onValueChange={(value: string) =>
                    updateFormData({ evaluationMethod: value })
                  }
                  className="space-y-4"
                >
                  {evaluationMethods.map((method) => (
                    <div
                      key={method.method}
                      className="flex items-center space-x-2 p-4 border rounded-lg"
                    >
                      <RadioGroupItem
                        value={method.method}
                        id={method.method}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={method.method}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {method.name}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Provide details about this evaluation run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Evaluation Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Tool Correctness - Week 1"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this evaluation is testing..."
                    value={formData.description}
                    onChange={(e) =>
                      updateFormData({ description: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {selectedMethod && (
              <Card>
                <CardHeader>
                  <CardTitle>Method Configuration</CardTitle>
                  <CardDescription>
                    Configure parameters for {selectedMethod.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedMethod.schema?.properties ? (
                    <>
                      {/* Required parameters (have defaults) */}
                      {Object.entries(selectedMethod.schema.properties)
                        .filter(([paramKey, paramDef]) => {
                          const defaultValue =
                            selectedMethod.defaults?.[paramKey] ??
                            paramDef.default;
                          return defaultValue !== undefined;
                        })
                        .map(([paramKey, paramDef]) => {
                          const defaultValue =
                            selectedMethod.defaults?.[paramKey] ??
                            paramDef.default;
                          const currentValue =
                            formData.configuration[paramKey] ?? defaultValue;

                          return (
                            <div key={paramKey}>
                              <Label htmlFor={paramKey}>
                                {paramKey
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Label>
                              {paramDef.description && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {String(paramDef.description)}
                                </p>
                              )}
                              {paramDef.type === 'number' ? (
                                <Input
                                  id={paramKey}
                                  type="number"
                                  min={paramDef.minimum}
                                  max={paramDef.maximum}
                                  step={0.1}
                                  value={String(currentValue)}
                                  onChange={(e) =>
                                    updateFormData({
                                      configuration: {
                                        ...formData.configuration,
                                        [paramKey]: parseFloat(e.target.value),
                                      },
                                    })
                                  }
                                />
                              ) : paramDef.type === 'boolean' ||
                                typeof defaultValue === 'boolean' ? (
                                <RadioGroup
                                  value={String(currentValue)}
                                  onValueChange={(value: string) =>
                                    updateFormData({
                                      configuration: {
                                        ...formData.configuration,
                                        [paramKey]: value === 'true',
                                      },
                                    })
                                  }
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="true"
                                      id={`${paramKey}-true`}
                                    />
                                    <Label htmlFor={`${paramKey}-true`}>
                                      Enabled
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="false"
                                      id={`${paramKey}-false`}
                                    />
                                    <Label htmlFor={`${paramKey}-false`}>
                                      Disabled
                                    </Label>
                                  </div>
                                </RadioGroup>
                              ) : Array.isArray(defaultValue) ? (
                                <div className="text-sm text-muted-foreground">
                                  Array field (not implemented yet)
                                </div>
                              ) : (
                                <Input
                                  id={paramKey}
                                  value={String(currentValue)}
                                  onChange={(e) =>
                                    updateFormData({
                                      configuration: {
                                        ...formData.configuration,
                                        [paramKey]: e.target.value,
                                      },
                                    })
                                  }
                                />
                              )}
                            </div>
                          );
                        })}

                      {/* Optional parameters (no defaults) - shown when toggled */}
                      {Object.entries(selectedMethod.schema.properties)
                        .filter(([paramKey, paramDef]) => {
                          const defaultValue =
                            selectedMethod.defaults?.[paramKey] ??
                            paramDef.default;
                          return (
                            defaultValue === undefined &&
                            shownOptionalParams.has(paramKey)
                          );
                        })
                        .map(([paramKey, paramDef]) => {
                          const currentValue = formData.configuration[paramKey];

                          return (
                            <div
                              key={paramKey}
                              className="border-l-2 border-blue-200 pl-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Label htmlFor={paramKey}>
                                  {paramKey
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l) =>
                                      l.toUpperCase(),
                                    )}{' '}
                                  <span className="text-xs text-muted-foreground">
                                    (optional)
                                  </span>
                                </Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => hideOptionalParam(paramKey)}
                                  className="h-6 w-6 p-0"
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                              {paramDef.description && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {String(paramDef.description)}
                                </p>
                              )}
                              {paramDef.type === 'number' ? (
                                <Input
                                  id={paramKey}
                                  type="number"
                                  min={paramDef.minimum}
                                  max={paramDef.maximum}
                                  step={0.1}
                                  value={
                                    currentValue ? String(currentValue) : ''
                                  }
                                  onChange={(e) =>
                                    updateFormData({
                                      configuration: {
                                        ...formData.configuration,
                                        [paramKey]: parseFloat(e.target.value),
                                      },
                                    })
                                  }
                                />
                              ) : paramDef.type === 'boolean' ? (
                                <RadioGroup
                                  value={
                                    currentValue ? String(currentValue) : ''
                                  }
                                  onValueChange={(value: string) =>
                                    updateFormData({
                                      configuration: {
                                        ...formData.configuration,
                                        [paramKey]: value === 'true',
                                      },
                                    })
                                  }
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="true"
                                      id={`${paramKey}-true`}
                                    />
                                    <Label htmlFor={`${paramKey}-true`}>
                                      Enabled
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="false"
                                      id={`${paramKey}-false`}
                                    />
                                    <Label htmlFor={`${paramKey}-false`}>
                                      Disabled
                                    </Label>
                                  </div>
                                </RadioGroup>
                              ) : (
                                <Input
                                  id={paramKey}
                                  value={
                                    currentValue ? String(currentValue) : ''
                                  }
                                  onChange={(e) =>
                                    updateFormData({
                                      configuration: {
                                        ...formData.configuration,
                                        [paramKey]: e.target.value,
                                      },
                                    })
                                  }
                                />
                              )}
                            </div>
                          );
                        })}

                      {/* Toggle buttons for hidden optional parameters */}
                      {Object.entries(selectedMethod.schema.properties)
                        .filter(([paramKey, paramDef]) => {
                          const defaultValue =
                            selectedMethod.defaults?.[paramKey] ??
                            paramDef.default;
                          return (
                            defaultValue === undefined &&
                            !shownOptionalParams.has(paramKey)
                          );
                        })
                        .map(([paramKey, paramDef]) => (
                          <div key={`toggle-${paramKey}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => showOptionalParam(paramKey)}
                              className="flex items-center gap-2"
                            >
                              <PlusIcon className="h-3 w-3" />
                              Add{' '}
                              {paramKey
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Button>
                            {paramDef.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {String(paramDef.description)}
                              </p>
                            )}
                          </div>
                        ))}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No configuration parameters required for this method.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'review':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review & Execute</CardTitle>
              <CardDescription>
                Review your evaluation configuration before executing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Evaluation Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.name || 'Untitled Evaluation'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Dataset</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedDataset?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Method</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedMethod?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Agent</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAgent.name}
                  </p>
                </div>
              </div>

              {formData.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.description}
                  </p>
                </div>
              )}

              {Object.keys(formData.configuration).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Configuration</Label>
                  <div className="mt-1 p-2 bg-muted rounded text-xs">
                    <pre>{JSON.stringify(formData.configuration, null, 2)}</pre>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <CheckCircleIcon className="inline h-4 w-4 mr-1" />
                  This evaluation will run in the background. You can monitor
                  its progress in the Evaluations view.
                </p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'select-dataset':
        return formData.datasetId;
      case 'select-method':
        return formData.evaluationMethod;
      case 'configure':
        return formData.name.trim();
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'review':
        return 'Execute Evaluation';
      default:
        return 'Next';
    }
  };

  return (
    <>
      <PageHeader
        title="Create Evaluation"
        description={`Set up a new evaluation run for ${selectedSkill.name}`}
        onBack={handleBack}
      />
      <div className="p-6 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center space-x-4">
          {[
            { key: 'select-dataset', label: 'Dataset', icon: DatabaseIcon },
            { key: 'select-method', label: 'Method', icon: SettingsIcon },
            { key: 'configure', label: 'Configure', icon: SettingsIcon },
            { key: 'review', label: 'Review', icon: CheckCircleIcon },
          ].map((step, index) => {
            const isCurrent = step.key === currentStep;
            const isCompleted =
              (step.key === 'select-dataset' && formData.datasetId) ||
              (step.key === 'select-method' && formData.evaluationMethod) ||
              (step.key === 'configure' && formData.name) ||
              (step.key === 'review' && currentStep === 'review');

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted bg-muted text-muted-foreground'
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                </div>
                <span
                  className={`ml-2 text-sm ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
                {index < 3 && (
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground mx-4" />
                )}
              </div>
            );
          })}
        </div>

        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-end gap-2">
          <Button onClick={handleNext} disabled={!canProceed() || isCreating}>
            {isCreating ? (
              <>
                <PlayIcon className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {currentStep === 'review' ? (
                  <PlayIcon className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowRightIcon className="h-4 w-4 mr-2" />
                )}
                {getNextButtonText()}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
