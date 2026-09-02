'use client';

import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import {
  type SystemSettingsUpdateParams,
  TIMEOUT_SETTINGS,
  type TimeoutSetting,
} from '@shared/types/data/system-settings';
import { DeveloperModeToggle } from '@web/components/settings/developer-mode-toggle';
import {
  type ModelOption,
  ModelSelector,
} from '@web/components/settings/model-selector';
import {
  TimeoutField,
  timeoutProblem,
} from '@web/components/settings/timeout-field';
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
import { PageHeader } from '@web/components/ui/page-header';
import { useToast } from '@web/hooks/use-toast';
import { useAIProviders } from '@web/providers/ai-providers';
import { useModels } from '@web/providers/models';
import { useSystemSettings } from '@web/providers/system-settings';
import { sortModels } from '@web/utils/model-sorting';
import { RouteIcon, SaveIcon, SettingsIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

type ModelField =
  | 'system_prompt_reflection_model_id'
  | 'evaluation_generation_model_id'
  | 'embedding_model_id'
  | 'judge_model_id'
  | 'skill_arbiter_model_id'
  | 'intent_compaction_model_id';

interface FormValues extends Record<ModelField, string | null> {
  /**
   * Edited in seconds, keyed by the millisecond setting each one saves to, so
   * adding a timeout setting adds a field here without touching the wiring.
   */
  timeouts: Record<TimeoutSetting, number>;
  developer_mode: boolean;
}

/** Every timeout at its default, in seconds, before settings arrive. */
const blankTimeouts = (): Record<TimeoutSetting, number> =>
  Object.fromEntries(TIMEOUT_SETTINGS.map((key) => [key, 15])) as Record<
    TimeoutSetting,
    number
  >;

/** How each timeout reads in the dashboard. */
const TIMEOUT_LABELS: Record<TimeoutSetting, string> = {
  system_prompt_reflection_timeout_ms: 'Reflection Timeout',
  evaluation_generation_timeout_ms: 'Evaluation Generation Timeout',
  embedding_timeout_ms: 'Embedding Timeout',
  judge_timeout_ms: 'Judge Timeout',
  skill_arbiter_timeout_ms: 'Arbiter Timeout',
  intent_compaction_timeout_ms: 'Compaction Timeout',
};

const TIMEOUT_DESCRIPTIONS: Record<TimeoutSetting, string> = {
  system_prompt_reflection_timeout_ms:
    'Seconds one attempt may take at writing a system prompt or naming a new skill. Naming happens on the request path, so keep it within what the request can wait for.',
  evaluation_generation_timeout_ms:
    "Seconds one attempt at generating a skill's evaluations may take. Runs in the background, but holds the evaluation lock while it does.",
  embedding_timeout_ms:
    'Seconds one embedding call may take. Routing embeds every request, so this is the one every caller waits for — keep it short.',
  judge_timeout_ms:
    'Seconds one judging attempt may take, task extraction included. Runs after the response, once per evaluation per log.',
  skill_arbiter_timeout_ms:
    'Seconds one arbiter attempt may take; a timed-out attempt is retried once. Keep it as short as the model allows, since a request that matches no skill closely waits for the answer.',
  intent_compaction_timeout_ms:
    'Seconds one compaction attempt may take; a timed-out attempt is retried once. These prompts run to thousands of tokens, so allow more than the arbiter gets — when compaction keeps timing out, every request carrying that prompt pays the wait and then routes on a truncated one.',
};

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
    skill_arbiter_model_id: null,
    intent_compaction_model_id: null,
    timeouts: blankTimeouts(),
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
        intent_compaction_model_id: settings.intent_compaction_model_id,
        timeouts: Object.fromEntries(
          TIMEOUT_SETTINGS.map((key) => [key, settings[key] / 1000]),
        ) as Record<TimeoutSetting, number>,
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

  const handleTimeoutChange = (field: TimeoutSetting, seconds: number) => {
    setFormValues((prev) => ({
      ...prev,
      timeouts: { ...prev.timeouts, [field]: seconds },
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

  // The first timeout that cannot be saved, so the toast can name it.
  const badTimeout = TIMEOUT_SETTINGS.find(
    (key) => timeoutProblem(formValues.timeouts[key]) !== null,
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
    if (badTimeout) {
      toast({
        title: `Invalid ${TIMEOUT_LABELS[badTimeout].toLowerCase()}`,
        description: timeoutProblem(formValues.timeouts[badTimeout]) ?? '',
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
      if (
        formValues.intent_compaction_model_id !==
        settings?.intent_compaction_model_id
      ) {
        updateParams.intent_compaction_model_id =
          formValues.intent_compaction_model_id;
      }
      for (const key of TIMEOUT_SETTINGS) {
        const ms = formValues.timeouts[key] * 1000;
        if (ms !== settings?.[key]) {
          updateParams[key] = ms;
        }
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

            <TimeoutField
              label={TIMEOUT_LABELS.system_prompt_reflection_timeout_ms}
              description={
                TIMEOUT_DESCRIPTIONS.system_prompt_reflection_timeout_ms
              }
              seconds={formValues.timeouts.system_prompt_reflection_timeout_ms}
              onChange={(v) =>
                handleTimeoutChange('system_prompt_reflection_timeout_ms', v)
              }
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

            <TimeoutField
              label={TIMEOUT_LABELS.evaluation_generation_timeout_ms}
              description={
                TIMEOUT_DESCRIPTIONS.evaluation_generation_timeout_ms
              }
              seconds={formValues.timeouts.evaluation_generation_timeout_ms}
              onChange={(v) =>
                handleTimeoutChange('evaluation_generation_timeout_ms', v)
              }
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

            <TimeoutField
              label={TIMEOUT_LABELS.embedding_timeout_ms}
              description={TIMEOUT_DESCRIPTIONS.embedding_timeout_ms}
              seconds={formValues.timeouts.embedding_timeout_ms}
              onChange={(v) => handleTimeoutChange('embedding_timeout_ms', v)}
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

            <TimeoutField
              label={TIMEOUT_LABELS.judge_timeout_ms}
              description={TIMEOUT_DESCRIPTIONS.judge_timeout_ms}
              seconds={formValues.timeouts.judge_timeout_ms}
              onChange={(v) => handleTimeoutChange('judge_timeout_ms', v)}
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
              Two models sit on the request path when an agent routes a request
              to a skill itself, so a request waits for whichever it needs. The
              arbiter decides whether a request that resembles none of the
              agent&apos;s skills closely is a known job on new material or a
              new kind of job; each agent can override its model and timeout.
              The compactor summarises a system prompt too long to embed whole
              before routing embeds it.
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

            <TimeoutField
              label={TIMEOUT_LABELS.skill_arbiter_timeout_ms}
              description={TIMEOUT_DESCRIPTIONS.skill_arbiter_timeout_ms}
              seconds={formValues.timeouts.skill_arbiter_timeout_ms}
              onChange={(v) =>
                handleTimeoutChange('skill_arbiter_timeout_ms', v)
              }
              isLoading={isAnyLoading}
            />

            <ModelSelector
              label="Intent Compaction"
              description="Model that summarises an oversized system prompt so routing embeds what identifies the job rather than the prompt's first few thousand characters. Each distinct prompt is compacted once and cached."
              recommendation="gpt-5-mini or claude-haiku-4-5"
              value={formValues.intent_compaction_model_id}
              onChange={(v) =>
                handleFieldChange('intent_compaction_model_id', v)
              }
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
              required={false}
              emptyOption="Same as System Prompt Reflection"
            />

            <TimeoutField
              label={TIMEOUT_LABELS.intent_compaction_timeout_ms}
              description={TIMEOUT_DESCRIPTIONS.intent_compaction_timeout_ms}
              seconds={formValues.timeouts.intent_compaction_timeout_ms}
              onChange={(v) =>
                handleTimeoutChange('intent_compaction_timeout_ms', v)
              }
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
