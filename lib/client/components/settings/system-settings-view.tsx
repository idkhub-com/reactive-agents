'use client';

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@client/components/ui/command';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { Skeleton } from '@client/components/ui/skeleton';
import { Switch } from '@client/components/ui/switch';
import { useToast } from '@client/hooks/use-toast';
import { useAIProviders } from '@client/providers/ai-providers';
import { useModels } from '@client/providers/models';
import { useSystemSettings } from '@client/providers/system-settings';
import { sortModels } from '@client/utils/model-sorting';
import { cn } from '@client/utils/ui/utils';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import type { SystemSettingsUpdateParams } from '@shared/types/data/system-settings';
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CodeIcon,
  RefreshCwIcon,
  SaveIcon,
  SettingsIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

interface ModelOption {
  id: string;
  modelName: string;
  providerName: string;
  modelType: 'text' | 'embed';
  searchLabel: string;
}

interface SettingFieldProps {
  label: string;
  description: string;
  recommendation?: string;
  value: string | null;
  onChange: (value: string) => void;
  modelOptions: ModelOption[];
  isLoading: boolean;
  required?: boolean;
}

function SettingField({
  label,
  description,
  recommendation,
  value,
  onChange,
  modelOptions,
  isLoading,
  required = true,
}: SettingFieldProps): ReactElement {
  const [open, setOpen] = useState(false);

  const selectedModel = useMemo(
    () => modelOptions.find((m) => m.id === value),
    [modelOptions, value],
  );

  const showNotConfiguredWarning =
    required && !value && modelOptions.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr,300px] items-start py-4 border-b last:border-b-0">
      <div className="space-y-1">
        <h4 className="font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        {recommendation && (
          <p className="text-sm text-muted-foreground">
            Recommended: {recommendation}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  'w-[400px] justify-between',
                  showNotConfiguredWarning && 'border-destructive',
                )}
              >
                {selectedModel ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{selectedModel.modelName}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {selectedModel.providerName}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a model</span>
                )}
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandList>
                  <CommandEmpty>No model found.</CommandEmpty>
                  <CommandGroup>
                    {modelOptions.map((model) => (
                      <CommandItem
                        key={model.id}
                        value={model.searchLabel}
                        onSelect={() => {
                          onChange(model.id);
                          setOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === model.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <span>{model.modelName}</span>
                          <Badge variant="outline" className="text-xs">
                            {model.providerName}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {showNotConfiguredWarning && (
          <p className="text-sm text-destructive">This field is required</p>
        )}
      </div>
    </div>
  );
}

export function SystemSettingsView(): ReactElement {
  const { toast } = useToast();
  const { settings, isLoading, error, update, isUpdating, refetch } =
    useSystemSettings();
  const { models, isLoading: isLoadingModels, setQueryParams } = useModels();
  const { aiProviderConfigs: apiKeys } = useAIProviders();

  // Local state for form values
  const [formValues, setFormValues] = useState<{
    system_prompt_reflection_model_id: string | null;
    evaluation_generation_model_id: string | null;
    embedding_model_id: string | null;
    judge_model_id: string | null;
    developer_mode: boolean;
  }>({
    system_prompt_reflection_model_id: null,
    evaluation_generation_model_id: null,
    embedding_model_id: null,
    judge_model_id: null,
    developer_mode: false,
  });

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false);

  // Load all models
  useEffect(() => {
    setQueryParams({});
  }, [setQueryParams]);

  // Initialize form values from settings
  useEffect(() => {
    if (settings) {
      setFormValues({
        system_prompt_reflection_model_id:
          settings.system_prompt_reflection_model_id,
        evaluation_generation_model_id: settings.evaluation_generation_model_id,
        embedding_model_id: settings.embedding_model_id,
        judge_model_id: settings.judge_model_id,
        developer_mode: settings.developer_mode,
      });
      setIsDirty(false);
    }
  }, [settings]);

  // Transform models into searchable options and sort alphabetically
  const modelOptions = useMemo((): ModelOption[] => {
    const options = models.map((model) => {
      const apiKey = apiKeys.find((key) => key.id === model.ai_provider_id);
      const rawProvider = apiKey?.ai_provider as AIProvider;
      const providerName = rawProvider
        ? PrettyAIProvider[rawProvider] || rawProvider
        : 'Unknown';
      return {
        id: model.id,
        modelName: model.model_name,
        providerName,
        modelType: model.model_type,
        // searchLabel is used by cmdk for filtering - include both model name and provider
        searchLabel: `${model.model_name} ${providerName}`,
      };
    });
    // Sort alphabetically by model name, then by provider name
    return sortModels(options);
  }, [models, apiKeys]);

  // Filter models by type
  const textModelOptions = useMemo(
    () => modelOptions.filter((m) => m.modelType === 'text'),
    [modelOptions],
  );
  const embedModelOptions = useMemo(
    () => modelOptions.filter((m) => m.modelType === 'embed'),
    [modelOptions],
  );

  const handleFieldChange = (field: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Check if all required fields are filled
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (
      !formValues.system_prompt_reflection_model_id &&
      textModelOptions.length > 0
    ) {
      missing.push('System Prompt Reflection');
    }
    if (
      !formValues.evaluation_generation_model_id &&
      textModelOptions.length > 0
    ) {
      missing.push('Evaluation Generation');
    }
    if (!formValues.embedding_model_id && embedModelOptions.length > 0) {
      missing.push('Embedding Model');
    }
    if (!formValues.judge_model_id && textModelOptions.length > 0) {
      missing.push('Judge Model');
    }
    return missing;
  }, [formValues, textModelOptions.length, embedModelOptions.length]);

  const isSettingsComplete = missingFields.length === 0;

  const handleSave = async () => {
    // Validate all required fields
    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please configure: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateParams: SystemSettingsUpdateParams = {};

      // Only include fields that have changed
      if (
        formValues.system_prompt_reflection_model_id !==
        settings?.system_prompt_reflection_model_id
      ) {
        updateParams.system_prompt_reflection_model_id =
          formValues.system_prompt_reflection_model_id;
      }
      if (
        formValues.evaluation_generation_model_id !==
        settings?.evaluation_generation_model_id
      ) {
        updateParams.evaluation_generation_model_id =
          formValues.evaluation_generation_model_id;
      }
      if (formValues.embedding_model_id !== settings?.embedding_model_id) {
        updateParams.embedding_model_id = formValues.embedding_model_id;
      }
      if (formValues.judge_model_id !== settings?.judge_model_id) {
        updateParams.judge_model_id = formValues.judge_model_id;
      }
      if (formValues.developer_mode !== settings?.developer_mode) {
        updateParams.developer_mode = formValues.developer_mode;
      }

      if (Object.keys(updateParams).length === 0) {
        toast({
          title: 'No changes',
          description: 'No settings have been modified.',
        });
        return;
      }

      await update(updateParams);
      setIsDirty(false);

      toast({
        title: 'Settings saved',
        description: 'System settings have been updated successfully.',
      });
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description:
          err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const isAnyLoading = isLoading || isLoadingModels;
  const hasNoModels = !isAnyLoading && models.length === 0;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure system-wide settings for AI operations"
        actions={
          <Button
            onClick={handleSave}
            disabled={!isDirty || isUpdating || isAnyLoading}
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircleIcon className="h-5 w-5" />
                <p>{error}</p>
              </div>
              <Button variant="outline" onClick={refetch} className="mt-4">
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {hasNoModels && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium">No models configured</p>
                  <p className="text-sm text-muted-foreground">
                    You need to add at least one model before you can configure
                    system settings.
                  </p>
                  <Button asChild variant="outline" className="mt-2">
                    <Link href="/models/create">Add Your First Model</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasNoModels && !isSettingsComplete && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium">Settings incomplete</p>
                  <p className="text-sm text-muted-foreground">
                    Please configure all required models below for the system to
                    function properly. Missing: {missingFields.join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Model Configuration
            </CardTitle>
            <CardDescription>
              Select which models to use for internal AI operations. These
              models are used for system prompt optimization, evaluation
              generation, and other automated processes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingField
              label="System Prompt Reflection"
              description="Model used for analyzing and improving system prompts during optimization."
              recommendation="gpt-5.1, claude-sonnet-4-5, or claude-opus-4-5"
              value={formValues.system_prompt_reflection_model_id}
              onChange={(v) =>
                handleFieldChange('system_prompt_reflection_model_id', v)
              }
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
            />

            <SettingField
              label="Evaluation Generation"
              description="Model used for automatically generating evaluation criteria for skills."
              recommendation="gpt-5.1, claude-sonnet-4-5, or claude-opus-4-5"
              value={formValues.evaluation_generation_model_id}
              onChange={(v) =>
                handleFieldChange('evaluation_generation_model_id', v)
              }
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
            />

            <SettingField
              label="Embedding Model"
              description="Model used for generating text embeddings for request clustering."
              recommendation="text-embedding-3-small (OpenAI) or gemini-embedding-001 (Google)"
              value={formValues.embedding_model_id}
              onChange={(v) => handleFieldChange('embedding_model_id', v)}
              modelOptions={embedModelOptions}
              isLoading={isAnyLoading}
            />

            <SettingField
              label="Judge Model"
              description="Model used for evaluating and scoring responses during optimization."
              recommendation="gpt-5.1, claude-sonnet-4-5, or claude-opus-4-5"
              value={formValues.judge_model_id}
              onChange={(v) => handleFieldChange('judge_model_id', v)}
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CodeIcon className="h-5 w-5" />
              Developer Mode
            </CardTitle>
            <CardDescription>
              Advanced settings for development and debugging purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <h4 className="font-medium">Enable Developer Mode</h4>
                <p className="text-sm text-muted-foreground">
                  When enabled, shows the internal reactive-agents agent and all
                  its skills and data. This is useful for debugging and
                  development.
                </p>
              </div>
              <Switch
                checked={formValues.developer_mode}
                onCheckedChange={(checked) => {
                  setFormValues((prev) => ({
                    ...prev,
                    developer_mode: checked,
                  }));
                  setIsDirty(true);
                }}
                disabled={isAnyLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
