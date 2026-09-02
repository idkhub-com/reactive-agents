'use client';

import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import {
  MAX_SKILL_ARBITER_TIMEOUT_MS,
  MIN_SKILL_ARBITER_TIMEOUT_MS,
  type SystemSettingsUpdateParams,
} from '@shared/types/data/system-settings';
import { DeveloperModeToggle } from '@web/components/settings/developer-mode-toggle';
import {
  type ModelOption,
  ModelSelector,
} from '@web/components/settings/model-selector';
import {
  ErrorWarning,
  IncompleteSettingsWarning,
  NoModelsWarning,
} from '@web/components/settings/validation-warnings';
import { Button } from '@web/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/components/ui/card';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { PageHeader } from '@web/components/ui/page-header';
import { useToast } from '@web/hooks/use-toast';
import { useAIProviders } from '@web/providers/ai-providers';
import { useModels } from '@web/providers/models';
import { useSystemSettings } from '@web/providers/system-settings';
import { sortModels } from '@web/utils/model-sorting';
import { RouteIcon, SaveIcon, SettingsIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';

const MIN_ARBITER_TIMEOUT_SECONDS = MIN_SKILL_ARBITER_TIMEOUT_MS / 1000;
const MAX_ARBITER_TIMEOUT_SECONDS = MAX_SKILL_ARBITER_TIMEOUT_MS / 1000;

type ModelField =
  | 'system_prompt_reflection_model_id'
  | 'evaluation_generation_model_id'
  | 'embedding_model_id'
  | 'judge_model_id'
  | 'skill_arbiter_model_id';

interface FormValues extends Record<ModelField, string | null> {
  /** Edited in seconds; the setting itself is in milliseconds. */
  skill_arbiter_timeout_seconds: number;
  developer_mode: boolean;
}

/** Why the arbiter timeout cannot be saved as entered, or null when it can. */
export function arbiterTimeoutProblem(seconds: number): string | null {
  if (
    Number.isInteger(seconds) &&
    seconds >= MIN_ARBITER_TIMEOUT_SECONDS &&
    seconds <= MAX_ARBITER_TIMEOUT_SECONDS
  ) {
    return null;
  }
  return `Enter a whole number of seconds between ${MIN_ARBITER_TIMEOUT_SECONDS} and ${MAX_ARBITER_TIMEOUT_SECONDS}.`;
}

export function SystemSettingsView(): ReactElement {
  const { toast } = useToast();
  const { settings, isLoading, error, update, isUpdating, refetch } =
    useSystemSettings();
  const { models, isLoading: isLoadingModels, setQueryParams } = useModels();
  const { aiProviderConfigs: apiKeys } = useAIProviders();
  const timeoutId = useId();
  const timeoutDescriptionId = `${timeoutId}-description`;

  // Local state for form values
  const [formValues, setFormValues] = useState<FormValues>({
    system_prompt_reflection_model_id: null,
    evaluation_generation_model_id: null,
    embedding_model_id: null,
    judge_model_id: null,
    skill_arbiter_model_id: null,
    skill_arbiter_timeout_seconds: 15,
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
        skill_arbiter_model_id: settings.skill_arbiter_model_id,
        skill_arbiter_timeout_seconds: settings.skill_arbiter_timeout_ms / 1000,
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

  const handleFieldChange = (field: ModelField, value: string | null) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleTimeoutChange = (seconds: number) => {
    setFormValues((prev) => ({
      ...prev,
      skill_arbiter_timeout_seconds: seconds,
    }));
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

  const timeoutProblem = arbiterTimeoutProblem(
    formValues.skill_arbiter_timeout_seconds,
  );

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
    if (timeoutProblem) {
      toast({
        title: 'Invalid arbiter timeout',
        description: timeoutProblem,
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
      if (
        formValues.skill_arbiter_model_id !== settings?.skill_arbiter_model_id
      ) {
        updateParams.skill_arbiter_model_id = formValues.skill_arbiter_model_id;
      }
      const timeoutMs = formValues.skill_arbiter_timeout_seconds * 1000;
      if (timeoutMs !== settings?.skill_arbiter_timeout_ms) {
        updateParams.skill_arbiter_timeout_ms = timeoutMs;
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5" aria-hidden="true" />
              Skill Routing
            </CardTitle>
            <CardDescription>
              When a request names only its agent and resembles none of the
              agent&apos;s skills closely, the arbiter decides whether it is a
              known job on new material or a new kind of job. It answers on the
              request path, so the request waits for it. Each agent can override
              both settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelSelector
              label="Skill Arbiter"
              description="Model that makes the call. A fast model serves best; it only has to name a skill or none."
              recommendation="gpt-5-mini or claude-haiku-4-5"
              value={formValues.skill_arbiter_model_id}
              onChange={(v) => handleFieldChange('skill_arbiter_model_id', v)}
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
              required={false}
              emptyOption="Same as System Prompt Reflection"
            />

            <div className="grid gap-4 md:grid-cols-[1fr,300px] items-start py-4 border-b last:border-b-0">
              <div className="space-y-1">
                <Label htmlFor={timeoutId} className="font-medium text-base">
                  Arbiter Timeout
                </Label>
                <p
                  id={timeoutDescriptionId}
                  className="text-sm text-muted-foreground"
                >
                  Seconds one arbiter attempt may take; a timed-out attempt is
                  retried once. Keep it as short as the model allows, since a
                  request that matches no skill closely waits for the answer.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id={timeoutId}
                    type="number"
                    inputMode="numeric"
                    min={MIN_ARBITER_TIMEOUT_SECONDS}
                    max={MAX_ARBITER_TIMEOUT_SECONDS}
                    step={1}
                    className="w-32"
                    value={
                      Number.isNaN(formValues.skill_arbiter_timeout_seconds)
                        ? ''
                        : formValues.skill_arbiter_timeout_seconds
                    }
                    onChange={(e) =>
                      handleTimeoutChange(e.target.valueAsNumber)
                    }
                    disabled={isAnyLoading}
                    aria-describedby={timeoutDescriptionId}
                    aria-invalid={timeoutProblem !== null}
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
                {timeoutProblem && (
                  <p className="text-sm text-destructive" role="alert">
                    {timeoutProblem}
                  </p>
                )}
              </div>
            </div>
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
