'use client';

import { getEvaluationMethods } from '@client/api/v1/reactive-agents/skills';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Checkbox } from '@client/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@client/components/ui/command';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { Skeleton } from '@client/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useToast } from '@client/hooks/use-toast';
import { useAIProviders } from '@client/providers/ai-providers';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationEvaluations } from '@client/providers/skill-optimization-evaluations';
import { useSkills } from '@client/providers/skills';
import { sortModels } from '@client/utils/model-sorting';
import { cn } from '@client/utils/ui/utils';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import type { EvaluationMethodDetails } from '@shared/types/evaluations';
import {
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2,
  RotateCcw,
  SaveIcon,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  modelType: 'text' | 'embed';
}

export function EvaluationEditView(): ReactElement {
  const { selectedSkill } = useSkills();
  const { navigationState } = useNavigation();
  const goBack = useSmartBack();
  const { toast } = useToast();

  const { evaluations, updateEvaluation, setSkillId } =
    useSkillOptimizationEvaluations();
  const { models, setQueryParams } = useModels();
  const { aiProviderConfigs } = useAIProviders();

  // Fetch all models on mount
  useEffect(() => {
    setQueryParams({});
  }, [setQueryParams]);

  const [isSaving, setIsSaving] = useState(false);
  const [evaluationMethods, setEvaluationMethods] = useState<
    EvaluationMethodDetails[]
  >([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);

  // Form state
  const [weight, setWeight] = useState<string>('1.0');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [modelId, setModelId] = useState<string | null>(null);

  // Build model options (text models only for evaluations), sorted alphabetically
  const textModelOptions = useMemo((): ModelOption[] => {
    const options = models
      .filter((model) => model.model_type === 'text')
      .map((model) => {
        const provider = aiProviderConfigs.find(
          (p) => p.id === model.ai_provider_id,
        );
        return {
          id: model.id,
          name: model.model_name,
          provider: (provider?.ai_provider ?? 'openai') as AIProvider,
          modelType: model.model_type,
        };
      });
    // Sort alphabetically by model name, then by provider name
    return sortModels(options);
  }, [models, aiProviderConfigs]);

  // Fetch evaluation methods from server
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setIsLoadingMethods(true);
        const methods = await getEvaluationMethods();
        setEvaluationMethods(methods);
      } catch (error) {
        console.error('Failed to fetch evaluation methods:', error);
        toast({
          title: 'Failed to load evaluation methods',
          description: 'Please try refreshing the page.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingMethods(false);
      }
    };

    fetchMethods();
  }, [toast]);

  // Set skill ID when skill changes
  useEffect(() => {
    if (!selectedSkill) {
      setSkillId(null);
      return;
    }
    setSkillId(selectedSkill.id);
  }, [selectedSkill, setSkillId]);

  // Find the evaluation being edited
  const evaluation = useMemo(() => {
    if (!navigationState.selectedEvaluationId) return undefined;
    return evaluations.find(
      (e) => e.id === navigationState.selectedEvaluationId,
    );
  }, [evaluations, navigationState.selectedEvaluationId]);

  // Find evaluation method details
  const evaluationMethod = useMemo(() => {
    if (!evaluation) return undefined;
    return evaluationMethods.find(
      (m) => m.method === evaluation.evaluation_method,
    );
  }, [evaluation, evaluationMethods]);

  // Initialize form when evaluation loads
  useEffect(() => {
    if (evaluation && evaluationMethod) {
      setWeight(evaluation.weight.toString());
      setModelId(evaluation.model_id);

      // Extract defaults from JSON schema if available
      if (evaluationMethod.parameterSchema) {
        const schemaDefaults: Record<string, unknown> = {};

        // Extract default values from JSON schema properties
        // biome-ignore lint/suspicious/noExplicitAny: JSON schema type is dynamic
        const properties = (evaluationMethod.parameterSchema as any)
          ?.properties;
        if (properties) {
          for (const [key, prop] of Object.entries(properties)) {
            // biome-ignore lint/suspicious/noExplicitAny: JSON schema property type is dynamic
            const propDef = prop as any;
            if ('default' in propDef) {
              schemaDefaults[key] = propDef.default;
            }
          }
        }

        // Merge schema defaults with existing params (existing params take precedence)
        const mergedParams = {
          ...schemaDefaults,
          ...evaluation.params,
        };
        setParams(mergedParams);
      } else {
        // Fall back to just using existing params
        setParams(evaluation.params);
      }
    }
  }, [evaluation, evaluationMethod]);

  const handleSave = async () => {
    if (!selectedSkill || !evaluation) return;

    const numericWeight = Number.parseFloat(weight);

    // Validate weight
    if (Number.isNaN(numericWeight) || numericWeight <= 0) {
      toast({
        title: 'Invalid weight',
        description: 'Weight must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Send all params including model_id
      await updateEvaluation(selectedSkill.id, evaluation.id, {
        weight: numericWeight,
        params,
        model_id: modelId,
      });

      toast({
        title: 'Evaluation updated',
        description: 'The evaluation has been updated successfully.',
      });

      goBack();
    } catch (error) {
      console.error('Failed to update evaluation:', error);
      toast({
        title: 'Failed to update evaluation',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleParamChange = (key: string, value: unknown) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetToDefault = (key: string) => {
    // Get the default value from the schema
    if (!evaluationMethod?.parameterSchema) return;

    // biome-ignore lint/suspicious/noExplicitAny: JSON schema type is dynamic
    const properties = (evaluationMethod.parameterSchema as any)?.properties;
    if (!properties || !properties[key] || !('default' in properties[key]))
      return;

    // Reset to default value
    setParams((prev) => ({
      ...prev,
      [key]: properties[key].default,
    }));
  };

  // Check if a param has a default value in the schema
  const hasDefault = (key: string): boolean => {
    if (!evaluationMethod?.parameterSchema) return false;

    // biome-ignore lint/suspicious/noExplicitAny: JSON schema type is dynamic
    const properties = (evaluationMethod.parameterSchema as any)?.properties;
    if (!properties || !properties[key]) return false;

    return 'default' in properties[key];
  };

  // Check if the current value differs from the default
  // biome-ignore lint/correctness/useExhaustiveDependencies: params dependency needed to trigger re-render when values change
  const isDifferentFromDefault = useCallback(
    (key: string, value: unknown): boolean => {
      if (!evaluationMethod?.parameterSchema) return false;

      // biome-ignore lint/suspicious/noExplicitAny: JSON schema type is dynamic
      const properties = (evaluationMethod.parameterSchema as any)?.properties;
      if (!properties || !properties[key] || !('default' in properties[key]))
        return false;

      const defaultValue = properties[key].default;

      // Deep equality check for objects/arrays, otherwise simple equality
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value) !== JSON.stringify(defaultValue);
      }

      return value !== defaultValue;
    },
    [evaluationMethod?.parameterSchema, params],
  );

  const renderParamInput = (key: string, value: unknown) => {
    const showReset = hasDefault(key) && isDifferentFromDefault(key, value);

    // Determine the type of input based on the value
    if (typeof value === 'boolean') {
      return (
        <div key={key} className="flex items-center gap-2 h-8">
          <Checkbox
            id={key}
            checked={value}
            onCheckedChange={(checked: boolean) =>
              handleParamChange(key, checked)
            }
            disabled={isSaving}
          />
          <Label htmlFor={key} className="capitalize">
            {key.replace(/_/g, ' ')}
          </Label>
          {showReset && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleResetToDefault(key)}
                    disabled={isSaving}
                    className="h-8 w-8"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset to default</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    }

    if (typeof value === 'number') {
      // Extract min/max from schema
      let min: number | undefined;
      let max: number | undefined;
      if (evaluationMethod?.parameterSchema) {
        // biome-ignore lint/suspicious/noExplicitAny: JSON schema type is dynamic
        const properties = (evaluationMethod.parameterSchema as any)
          ?.properties;
        if (properties?.[key]) {
          min = properties[key].minimum;
          max = properties[key].maximum;
        }
      }

      return (
        <div key={key} className="space-y-2">
          <div className="inline-flex items-center gap-2 h-8">
            <Label htmlFor={key} className="capitalize">
              {key.replace(/_/g, ' ')}
            </Label>
            {showReset && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetToDefault(key)}
                      disabled={isSaving}
                      className="h-8 w-8"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset to default</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Input
            id={key}
            type="number"
            value={value}
            onChange={(e) => {
              const numValue = Number.parseFloat(e.target.value);
              if (!Number.isNaN(numValue)) {
                handleParamChange(key, numValue);
              }
            }}
            disabled={isSaving}
            step="any"
            min={min}
            max={max}
            className="w-32"
          />
        </div>
      );
    }

    if (typeof value === 'string') {
      return (
        <div key={key} className="space-y-2">
          <div className="inline-flex items-center gap-2 h-8">
            <Label htmlFor={key} className="capitalize flex-1">
              {key.replace(/_/g, ' ')}
            </Label>
            {showReset && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetToDefault(key)}
                      disabled={isSaving}
                      className="h-8 w-8"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset to default</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Input
            id={key}
            type="text"
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            disabled={isSaving}
          />
        </div>
      );
    }

    // For complex types, show as JSON
    return (
      <div key={key} className="space-y-2">
        <div className="flex items-center gap-2 h-8">
          <Label htmlFor={key} className="capitalize">
            {key.replace(/_/g, ' ')}
          </Label>
          {showReset && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleResetToDefault(key)}
                    disabled={isSaving}
                    className="h-8 w-8"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset to default</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Input
          id={key}
          type="text"
          value={JSON.stringify(value)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleParamChange(key, parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          disabled={isSaving}
        />
      </div>
    );
  };

  // Show error if no evaluation ID in navigation state
  if (!navigationState.selectedEvaluationId) {
    return (
      <>
        <PageHeader
          title="Edit Evaluation"
          description="No evaluation selected"
          showBackButton={true}
          onBack={goBack}
        />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                No evaluation selected. Please go back and select an evaluation
                to edit.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Show loading state
  if (isLoadingMethods || !evaluation) {
    return (
      <>
        <PageHeader
          title="Edit Evaluation"
          description="Loading evaluation data..."
          showBackButton={true}
          onBack={goBack}
        />
        <div className="p-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${evaluationMethod?.name || 'Evaluation'}`}
        description={`Configure the parameters for this evaluation method`}
        showBackButton={true}
        onBack={goBack}
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Evaluation Info */}
        <Card>
          <CardHeader>
            <CardTitle>{evaluationMethod?.name || 'Evaluation'}</CardTitle>
            <CardDescription>
              {evaluationMethod?.description ||
                'Configure this evaluation method'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Weight Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Weight</CardTitle>
            <CardDescription>
              The relative importance of this evaluation in the overall score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Weight (must be positive)</Label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                disabled={isSaving}
                step="0.1"
                min="0.01"
              />
            </div>
          </CardContent>
        </Card>

        {/* Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Model</CardTitle>
            <CardDescription>
              The model used to run this evaluation. If not set, the system
              default will be used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Evaluation Model</Label>
              <Popover
                open={modelPopoverOpen}
                onOpenChange={setModelPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    aria-expanded={modelPopoverOpen}
                    className="w-full justify-between"
                    disabled={isSaving}
                  >
                    {modelId ? (
                      (() => {
                        const selectedModel = textModelOptions.find(
                          (m) => m.id === modelId,
                        );
                        return selectedModel ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">
                              {selectedModel.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {PrettyAIProvider[selectedModel.provider] ??
                                selectedModel.provider}
                            </Badge>
                          </div>
                        ) : (
                          'Select a model...'
                        );
                      })()
                    ) : (
                      <span className="text-muted-foreground">
                        Use system default
                      </span>
                    )}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search models..." />
                    <CommandList>
                      <CommandEmpty>No models found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setModelId(null);
                            setModelPopoverOpen(false);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              'mr-2 h-4 w-4',
                              modelId === null ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="text-muted-foreground">
                            Use system default
                          </span>
                        </CommandItem>
                        {textModelOptions.map((model) => (
                          <CommandItem
                            key={model.id}
                            value={`${model.name} ${PrettyAIProvider[model.provider] ?? model.provider}`}
                            onSelect={() => {
                              setModelId(model.id);
                              setModelPopoverOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                'mr-2 h-4 w-4',
                                modelId === model.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {PrettyAIProvider[model.provider] ??
                                  model.provider}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {textModelOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No text models available. Add models in AI Providers &amp;
                  Models settings.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parameters Configuration */}
        {Object.keys(params).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parameters</CardTitle>
              <CardDescription>
                Configure the specific parameters for this evaluation method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Render params in schema order if available, otherwise alphabetical */}
              {(() => {
                // biome-ignore lint/suspicious/noExplicitAny: JSON schema type is dynamic
                const properties = (evaluationMethod?.parameterSchema as any)
                  ?.properties;
                const schemaKeys = properties ? Object.keys(properties) : [];

                // If we have schema keys, use that order; otherwise use params keys
                const orderedKeys =
                  schemaKeys.length > 0
                    ? schemaKeys.filter((key) => key in params)
                    : Object.keys(params);

                return orderedKeys.map((key) =>
                  renderParamInput(key, params[key]),
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Save Button (mobile) */}
        <div className="lg:hidden">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
