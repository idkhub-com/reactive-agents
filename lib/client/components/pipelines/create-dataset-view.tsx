'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/components/ui/form';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import { Textarea } from '@client/components/ui/textarea';
import { ValidationStatus } from '@client/components/ui/validation-status';
import { useDatasetNameValidation } from '@client/hooks/use-dataset-name-validation';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import { useNavigation } from '@client/providers/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Dataset, DatasetCreateParams } from '@shared/types/data';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { Check, Database, Eye, Home, Info, Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SelectLogsDialog } from './select-logs-dialog';

const createDatasetSchema = z.object({
  name: z.string().min(1, 'Dataset name is required'),
  description: z.string().optional(),
});

// Enhanced schema with async validation
const createDatasetSchemaWithValidation = (isNameAvailable: boolean | null) =>
  createDatasetSchema.refine(() => isNameAvailable !== false, {
    message: 'A dataset with this name already exists for this agent',
    path: ['name'],
  });

type CreateDatasetFormData = z.infer<typeof createDatasetSchema>;

// Step enum for the two-step process
enum CreateDatasetStep {
  DATASET_INFO = 'dataset-info',
  SELECT_LOGS = 'select-logs',
}

export function CreateDatasetView(): ReactElement {
  const {
    navigationState,
    navigateToDatasets,
    navigateToDatasetDetail,
    replaceToDatasets,
  } = useNavigation();
  const { toast } = useToast();
  const { createDataset, addLogs, refetch } = useDatasets();
  const smartBack = useSmartBack();

  // Two-step flow state
  const [currentStep, setCurrentStep] = useState<CreateDatasetStep>(
    CreateDatasetStep.DATASET_INFO,
  );
  const [createdDataset, setCreatedDataset] = useState<Dataset | null>(null);

  // Logs selection state
  const [selectedLogs, setSelectedLogs] = useState<IdkRequestLog[]>([]);
  const [addLogsDialogOpen, setAddLogsDialogOpen] = useState(false);

  // Get the current name value for validation
  const [currentName, setCurrentName] = useState('');

  // Extract selected agent and skill for hooks
  const selectedAgent = navigationState.selectedAgent;
  const selectedSkill = navigationState.selectedSkill;

  // Validate dataset name in real-time
  const {
    isValidating,
    isAvailable,
    existingNames,
    error: validationError,
    suggestAlternativeName,
  } = useDatasetNameValidation(
    currentName,
    selectedAgent?.id,
    currentStep === CreateDatasetStep.DATASET_INFO,
  );

  const form = useForm<CreateDatasetFormData>({
    resolver: zodResolver(createDatasetSchemaWithValidation(isAvailable)),
    defaultValues: {
      name: '',
      description: '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  // Update current name when form value changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.name !== undefined) {
        setCurrentName(value.name);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const [isCreating, setIsCreating] = useState(false);

  const onSubmit = (_data: CreateDatasetFormData) => {
    // Double-check name availability before submitting
    if (isAvailable === false) {
      form.setError('name', {
        type: 'manual',
        message: 'A dataset with this name already exists for this agent',
      });
      return;
    }

    if (isValidating) {
      toast({
        title: 'Please wait',
        description: 'Still checking name availability...',
      });
      return;
    }

    // Store form data and move to step 2 instead of creating immediately
    setCurrentStep(CreateDatasetStep.SELECT_LOGS);
  };

  const handleFinalCreate = useCallback(async () => {
    const formData = form.getValues();
    const createParams: DatasetCreateParams = {
      name: formData.name.trim(),
      agent_id: selectedAgent!.id,
      description: formData.description?.trim() || null,
      metadata: {},
    };

    setIsCreating(true);
    try {
      // Create the dataset first
      const newDataset = await createDataset(createParams);

      // If there are selected logs, add them to the dataset
      if (selectedLogs.length > 0) {
        const logIds = selectedLogs.map((log) => log.id);
        await addLogs(newDataset.id, logIds);
      }

      toast({
        title: 'Dataset created successfully',
        description: `Dataset "${newDataset.name}" has been created with ${selectedLogs.length} logs.`,
      });

      // Refresh datasets list and redirect to datasets, replacing history
      refetch();
      if (navigationState.selectedAgent && navigationState.selectedSkill) {
        replaceToDatasets(
          navigationState.selectedAgent.name,
          navigationState.selectedSkill.name,
        );
        return;
      }
    } catch (error) {
      console.error('Failed to create dataset:', error);

      // Parse error message to provide better feedback
      let errorMessage = 'Please try again later';
      let errorTitle = 'Error creating dataset';

      if (
        error instanceof Error &&
        (error.message.includes('409') ||
          error.message.toLowerCase().includes('duplicate') ||
          error.message.toLowerCase().includes('unique'))
      ) {
        errorTitle = 'Dataset name already exists';
        errorMessage = `A dataset named "${currentName}" already exists for this agent. Please choose a different name.`;

        // Suggest an alternative name
        if (
          suggestAlternativeName &&
          typeof suggestAlternativeName === 'function'
        ) {
          const suggestion = suggestAlternativeName(currentName);
          errorMessage += ` Try "${suggestion}" instead.`;
        }
      }

      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  }, [
    form,
    selectedAgent,
    createDataset,
    addLogs,
    selectedLogs,
    refetch,
    toast,
    currentName,
    suggestAlternativeName,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
    replaceToDatasets,
  ]);

  const handleBack = useCallback(() => {
    if (currentStep === CreateDatasetStep.SELECT_LOGS) {
      // Go back to step 1 if in step 2
      setCurrentStep(CreateDatasetStep.DATASET_INFO);
      setCreatedDataset(null);
    } else {
      // Use smart back navigation from step 1
      if (navigationState.selectedAgent && navigationState.selectedSkill) {
        const fallbackUrl = `/pipelines/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}/datasets`;
        smartBack(fallbackUrl);
      } else {
        smartBack('/pipelines');
      }
    }
  }, [
    currentStep,
    smartBack,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  const handleCancel = useCallback(() => {
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      navigateToDatasets(
        navigationState.selectedAgent.name,
        navigationState.selectedSkill.name,
      );
    }
  }, [
    navigateToDatasets,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  const handleFinishAndViewDataset = useCallback(() => {
    if (
      createdDataset &&
      navigationState.selectedAgent &&
      navigationState.selectedSkill
    ) {
      // Navigate to dataset detail view
      navigateToDatasetDetail(
        navigationState.selectedAgent.name,
        navigationState.selectedSkill.name,
        createdDataset.id,
      );
    }
  }, [
    createdDataset,
    navigateToDatasetDetail,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  const handleAddLogs = useCallback(() => {
    if (
      createdDataset &&
      navigationState.selectedAgent &&
      navigationState.selectedSkill
    ) {
      // Navigate to dataset detail view which has the add logs functionality
      navigateToDatasetDetail(
        navigationState.selectedAgent.name,
        navigationState.selectedSkill.name,
        createdDataset.id,
      );
    }
  }, [
    createdDataset,
    navigateToDatasetDetail,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  const handleDone = useCallback(() => {
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      navigateToDatasets(
        navigationState.selectedAgent.name,
        navigationState.selectedSkill.name,
      );
    }
  }, [
    navigateToDatasets,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  // Early return after all hooks if required props are missing
  if (!selectedAgent || !selectedSkill) {
    return <div>No agent or skill selected</div>;
  }

  // Progress steps for header
  const steps = [
    {
      id: CreateDatasetStep.DATASET_INFO,
      title: 'Dataset Info',
      completed: currentStep === CreateDatasetStep.SELECT_LOGS,
    },
    {
      id: CreateDatasetStep.SELECT_LOGS,
      title: 'Select Logs',
      completed: false,
    },
  ];

  return (
    <>
      <PageHeader
        title="Create Dataset"
        description={`Create a new evaluation dataset for ${selectedSkill.name}`}
        onBack={handleBack}
      />
      <div className="p-6 h-full overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress indicator */}
          <Card>
            <CardHeader>
              {/* Progress indicator */}
              <div className="flex items-center gap-4 pt-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        step.completed
                          ? 'bg-primary border-primary text-primary-foreground'
                          : currentStep === step.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-muted-foreground/30 text-muted-foreground'
                      }`}
                    >
                      {step.completed ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        currentStep === step.id || step.completed
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-8 h-0.5 ${
                          step.completed
                            ? 'bg-primary'
                            : 'bg-muted-foreground/30'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Step 1: Dataset Info */}
          {currentStep === CreateDatasetStep.DATASET_INFO && (
            <>
              <Card>
                <CardHeader>
                  <h4 className="font-medium">Dataset Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Provide basic information about your dataset
                  </p>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => {
                          // Determine validation status
                          let validationStatus:
                            | 'idle'
                            | 'validating'
                            | 'available'
                            | 'unavailable'
                            | 'error' = 'idle';

                          if (validationError) {
                            validationStatus = 'error';
                          } else if (isValidating) {
                            validationStatus = 'validating';
                          } else if (
                            currentName.trim() &&
                            isAvailable === true
                          ) {
                            validationStatus = 'available';
                          } else if (
                            currentName.trim() &&
                            isAvailable === false
                          ) {
                            validationStatus = 'unavailable';
                          }

                          return (
                            <FormItem>
                              <FormLabel>Dataset Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter dataset name..."
                                  {...field}
                                  autoComplete="off"
                                  className={
                                    validationStatus === 'unavailable'
                                      ? 'border-red-500 focus:border-red-500'
                                      : validationStatus === 'available'
                                        ? 'border-green-500 focus:border-green-500'
                                        : ''
                                  }
                                />
                              </FormControl>

                              {/* Validation status indicator */}
                              <ValidationStatus
                                status={validationStatus}
                                errorMessage={
                                  validationError ||
                                  (isAvailable === false
                                    ? 'Dataset name already exists for this agent'
                                    : undefined)
                                }
                                successMessage="Dataset name is available"
                                className="mt-1"
                              />

                              <FormDescription>
                                A descriptive name for your evaluation dataset
                                {existingNames.length > 0 && (
                                  <span className="mt-2 block text-xs text-muted-foreground">
                                    Existing datasets:{' '}
                                    {existingNames.slice(0, 3).join(', ')}
                                    {existingNames.length > 3 &&
                                      ` and ${existingNames.length - 3} more`}
                                  </span>
                                )}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the purpose and contents of this dataset..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Optional description of what this dataset contains
                              and its intended use
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={
                            isCreating ||
                            form.formState.isSubmitting ||
                            isValidating ||
                            isAvailable === false ||
                            !currentName.trim()
                          }
                        >
                          <Database className="mr-2 h-4 w-4" />
                          Continue
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isCreating || form.formState.isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-medium">About Datasets</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                          • Datasets organize evaluation logs for model testing
                        </li>
                        <li>
                          • Logs can be imported from existing requests or added
                          manually
                        </li>
                        <li>
                          • Each log contains request/response pairs for
                          evaluation
                        </li>
                        <li>
                          • Use datasets to track model performance over time
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: Select Logs */}
          {currentStep === CreateDatasetStep.SELECT_LOGS && (
            <>
              {/* Selected Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Logs</CardTitle>
                  <CardDescription>
                    Choose logs to include in your dataset
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">
                        No logs selected yet
                      </div>
                      <Button onClick={() => setAddLogsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Logs
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {selectedLogs.length} log
                          {selectedLogs.length !== 1 ? 's' : ''} selected
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddLogsDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add More
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto border rounded p-4 space-y-2">
                        {selectedLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex justify-between items-center p-2 border rounded text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {log.ai_provider_request_log.method}
                              </span>{' '}
                              <span>
                                {log.ai_provider_request_log.request_url}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedLogs((prev) =>
                                  prev.filter((dp) => dp.id !== log.id),
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleFinalCreate}
                      disabled={isCreating || selectedLogs.length === 0}
                      className="flex-1"
                    >
                      {isCreating ? (
                        <>
                          <Database className="mr-2 h-4 w-4 animate-pulse" />
                          Creating Dataset...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Create Dataset
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-medium">What happens next?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                          • Your dataset will be created and ready for use
                        </li>
                        <li>• You can add logs from the datasets list</li>
                        <li>
                          • Logs can be imported from existing requests or added
                          manually
                        </li>
                        <li>
                          • Use your dataset to run evaluations and track
                          performance
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show success state if dataset was created */}
              {createdDataset && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div className="space-y-2">
                        <h4 className="font-medium text-green-900">
                          Dataset Created Successfully!
                        </h4>
                        <p className="text-sm text-green-700">
                          Your dataset "{createdDataset.name}" has been created
                          and is ready for use.
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleAddLogs} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Logs
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleFinishAndViewDataset}
                            size="sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Dataset
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDone}
                            size="sm"
                          >
                            <Home className="mr-2 h-4 w-4" />
                            Back to Datasets
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Logs Selection Dialog */}
      <SelectLogsDialog
        open={addLogsDialogOpen}
        onOpenChange={setAddLogsDialogOpen}
        onSelectLogs={(logs) => {
          setSelectedLogs((prev) => [...prev, ...logs]);
        }}
        alreadySelectedLogs={selectedLogs}
      />
    </>
  );
}
