'use client';

import { DeveloperModeToggle } from '@client/components/settings/developer-mode-toggle';
import {
  type ModelOption,
  ModelSelector,
} from '@client/components/settings/model-selector';
import {
  ErrorWarning,
  IncompleteSettingsWarning,
  NoModelsWarning,
} from '@client/components/settings/validation-warnings';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { PageHeader } from '@client/components/ui/page-header';
import { useToast } from '@client/hooks/use-toast';
import { useAIProviders } from '@client/providers/ai-providers';
import { useModels } from '@client/providers/models';
import { useSystemSettings } from '@client/providers/system-settings';
import { sortModels } from '@client/utils/model-sorting';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import type { SystemSettingsUpdateParams } from '@shared/types/data/system-settings';
import { SaveIcon, SettingsIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

interface FormValues {
  system_prompt_reflection_model_id: string | null;
  evaluation_generation_model_id: string | null;
  embedding_model_id: string | null;
  judge_model_id: string | null;
  developer_mode: boolean;
}

export function SystemSettingsView(): ReactElement {
  const { toast } = useToast();
  const { settings, isLoading, error, update, isUpdating, refetch } =
    useSystemSettings();
  const { models, isLoading: isLoadingModels, setQueryParams } = useModels();
  const { aiProviderConfigs: apiKeys } = useAIProviders();

  // Local state for form values
  const [formValues, setFormValues] = useState<FormValues>({
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

  const handleFieldChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleDeveloperModeChange = (checked: boolean) => {
    setFormValues((prev) => ({ ...prev, developer_mode: checked }));
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
            aria-label={isUpdating ? 'Saving changes' : 'Save changes'}
          >
            <SaveIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {error && <ErrorWarning error={error} onRetry={refetch} />}

        {hasNoModels && <NoModelsWarning />}

        {!hasNoModels && !isSettingsComplete && (
          <IncompleteSettingsWarning missingFields={missingFields} />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              Model Configuration
            </CardTitle>
            <CardDescription>
              Select which models to use for internal AI operations. These
              models are used for system prompt optimization, evaluation
              generation, and other automated processes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelSelector
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

            <ModelSelector
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

            <ModelSelector
              label="Embedding Model"
              description="Model used for generating text embeddings for request clustering."
              recommendation="text-embedding-3-small (OpenAI) or gemini-embedding-001 (Google)"
              value={formValues.embedding_model_id}
              onChange={(v) => handleFieldChange('embedding_model_id', v)}
              modelOptions={embedModelOptions}
              isLoading={isAnyLoading}
            />

            <ModelSelector
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

        <DeveloperModeToggle
          checked={formValues.developer_mode}
          onCheckedChange={handleDeveloperModeChange}
          disabled={isAnyLoading}
        />
      </div>
    </>
  );
}
