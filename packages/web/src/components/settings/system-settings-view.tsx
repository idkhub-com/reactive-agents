'use client';

import type { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import {
  INTERNAL_ROLES,
  type InternalRole,
  MAX_JUDGE_MAX_TOKENS,
  MIN_JUDGE_MAX_TOKENS,
  type SystemSettings,
  type SystemSettingsOptionsUpdate,
  type SystemSettingsUpdateParams,
  TEXT_ROLES,
  type TextRole,
} from '@shared/types/data/system-settings';
import {
  BoundedNumberField,
  boundedNumberProblem,
} from '@web/components/settings/bounded-number-field';
import { DeveloperModeToggle } from '@web/components/settings/developer-mode-toggle';
import {
  type ModelOption,
  ModelSelector,
} from '@web/components/settings/model-selector';
import { ReasoningEffortField } from '@web/components/settings/reasoning-effort-field';
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

export interface FormValues extends Record<ModelField, string | null> {
  /**
   * Edited in seconds, keyed by the role whose `options.<role>.timeout_ms`
   * each one saves to, so adding a role adds a field here without touching
   * the wiring.
   */
  timeouts: Record<InternalRole, number>;
  /** `options.judge.max_tokens`: completion tokens one judging call may spend. */
  judge_max_tokens: number;
  /**
   * `options.<role>.reasoning_effort`, keyed by role like the timeouts. Null
   * leaves that role's model to its own default.
   */
  reasoningEfforts: Record<TextRole, ReasoningEffort | null>;
  developer_mode: boolean;
}

/** Every timeout at a placeholder, in seconds, before settings arrive. */
const blankTimeouts = (): Record<InternalRole, number> =>
  Object.fromEntries(INTERNAL_ROLES.map((role) => [role, 15])) as Record<
    InternalRole,
    number
  >;

/** Every effort at the model's own default, before settings arrive. */
const blankReasoningEfforts = (): Record<TextRole, ReasoningEffort | null> =>
  Object.fromEntries(TEXT_ROLES.map((role) => [role, null])) as Record<
    TextRole,
    ReasoningEffort | null
  >;

/** What each role is called where a field has to name it. */
const ROLE_LABELS: Record<InternalRole, string> = {
  system_prompt_reflection: 'Reflection',
  evaluation_generation: 'Evaluation Generation',
  embedding: 'Embedding',
  judge: 'Judge',
  skill_arbiter: 'Arbiter',
  intent_compaction: 'Compaction',
};

/** How each role's timeout reads in the dashboard. */
const TIMEOUT_LABELS = Object.fromEntries(
  INTERNAL_ROLES.map((role) => [role, `${ROLE_LABELS[role]} Timeout`]),
) as Record<InternalRole, string>;

/** And its reasoning effort, where it has one. */
const REASONING_LABELS = Object.fromEntries(
  TEXT_ROLES.map((role) => [role, `${ROLE_LABELS[role]} Reasoning Effort`]),
) as Record<TextRole, string>;

const REASONING_DESCRIPTIONS: Record<TextRole, string> = {
  system_prompt_reflection:
    'How hard this model may think before writing a system prompt or naming a skill. Writing a prompt is the one internal call where thinking tends to pay for itself.',
  evaluation_generation:
    "How hard this model may think before writing a skill's evaluations. It runs in the background, so thinking costs time rather than a caller's wait.",
  judge:
    "How hard the judge may think before it answers. Its answer is a score and a sentence, so on a thinking model 'none' or 'low' keeps the token budget for the answer rather than the reasoning.",
  skill_arbiter:
    "The arbiter only has to name a skill or none, and a request waits for the answer, so 'none' or 'low' serves it best.",
  intent_compaction:
    'Compaction summarises a long system prompt, which is more transcription than deliberation. A request carrying an uncompacted prompt waits for it.',
};

const TIMEOUT_DESCRIPTIONS: Record<InternalRole, string> = {
  system_prompt_reflection:
    'Seconds one attempt may take at writing a system prompt or naming a new skill. Naming happens on the request path, so keep it within what the request can wait for.',
  evaluation_generation:
    "Seconds one attempt at generating a skill's evaluations may take. Runs in the background, but holds the evaluation lock while it does.",
  embedding:
    'Seconds one embedding call may take. Routing embeds every request, so this is the one every caller waits for — keep it short.',
  judge:
    'Seconds one judging attempt may take, task extraction included. Runs after the response, once per evaluation per log.',
  skill_arbiter:
    'Seconds one arbiter attempt may take; a timed-out attempt is retried once. Keep it as short as the model allows, since a request that matches no skill closely waits for the answer.',
  intent_compaction:
    'Seconds one compaction attempt may take; a timed-out attempt is retried once. These prompts run to thousands of tokens, so allow more than the arbiter gets — when compaction keeps timing out, every request carrying that prompt pays the wait and then routes on a truncated one.',
};

/**
 * The options a save sends: only what differs from the stored settings, one
 * object per role, so the server merges rather than overwrites. Exported for
 * the tests, since the reasoning-effort select cannot be driven in jsdom.
 */
export function buildOptionsPatch(
  formValues: FormValues,
  settings: SystemSettings | null,
): SystemSettingsOptionsUpdate {
  const options: SystemSettingsOptionsUpdate = {};
  for (const role of INTERNAL_ROLES) {
    const ms = formValues.timeouts[role] * 1000;
    if (ms !== settings?.options[role].timeout_ms) {
      options[role] = { timeout_ms: ms };
    }
  }
  if (formValues.judge_max_tokens !== settings?.options.judge.max_tokens) {
    options.judge = {
      ...options.judge,
      max_tokens: formValues.judge_max_tokens,
    };
  }
  for (const role of TEXT_ROLES) {
    const effort = formValues.reasoningEfforts[role];
    if (effort !== settings?.options[role].reasoning_effort) {
      options[role] = { ...options[role], reasoning_effort: effort };
    }
  }
  if (formValues.developer_mode !== settings?.options.developer_mode) {
    options.developer_mode = formValues.developer_mode;
  }
  return options;
}

const JUDGE_MAX_TOKENS_LABEL = 'Judge Token Budget';
const JUDGE_MAX_TOKENS_DESCRIPTION =
  "Completion tokens one judging attempt may spend, task extraction included. The answer itself is a few hundred tokens, but a reasoning model thinks first and counts that against the same budget — one it exhausts on reasoning returns nothing at all. Raise this when the judge's log shows empty answers that stopped on length.";

/** Why the token budget cannot be saved as entered, or null when it can. */
const judgeMaxTokensProblem = (tokens: number): string | null =>
  boundedNumberProblem(
    tokens,
    MIN_JUDGE_MAX_TOKENS,
    MAX_JUDGE_MAX_TOKENS,
    'tokens',
  );

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
    judge_max_tokens: MIN_JUDGE_MAX_TOKENS,
    reasoningEfforts: blankReasoningEfforts(),
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
          INTERNAL_ROLES.map((role) => [
            role,
            settings.options[role].timeout_ms / 1000,
          ]),
        ) as Record<InternalRole, number>,
        judge_max_tokens: settings.options.judge.max_tokens,
        reasoningEfforts: Object.fromEntries(
          TEXT_ROLES.map((role) => [
            role,
            settings.options[role].reasoning_effort,
          ]),
        ) as Record<TextRole, ReasoningEffort | null>,
        developer_mode: settings.options.developer_mode,
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

  const handleTimeoutChange = (role: InternalRole, seconds: number) => {
    setFormValues((prev) => ({
      ...prev,
      timeouts: { ...prev.timeouts, [role]: seconds },
    }));
    setIsDirty(true);
  };

  const handleJudgeMaxTokensChange = (tokens: number) => {
    setFormValues((prev) => ({ ...prev, judge_max_tokens: tokens }));
    setIsDirty(true);
  };

  const handleReasoningEffortChange = (
    role: TextRole,
    effort: ReasoningEffort | null,
  ) => {
    setFormValues((prev) => ({
      ...prev,
      reasoningEfforts: { ...prev.reasoningEfforts, [role]: effort },
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
  const badTimeout = INTERNAL_ROLES.find(
    (role) => timeoutProblem(formValues.timeouts[role]) !== null,
  );
  const badJudgeMaxTokens = judgeMaxTokensProblem(formValues.judge_max_tokens);

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
    if (badJudgeMaxTokens) {
      toast({
        title: `Invalid ${JUDGE_MAX_TOKENS_LABEL.toLowerCase()}`,
        description: badJudgeMaxTokens,
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
      // The options patch carries only what changed; the server merges it
      // over what is stored.
      const options = buildOptionsPatch(formValues, settings);
      if (Object.keys(options).length > 0) {
        updateParams.options = options;
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

  /** One role's reasoning effort, beside its timeout. */
  const reasoningControl = (role: TextRole): ReactElement => (
    <ReasoningEffortField
      label={REASONING_LABELS[role]}
      description={REASONING_DESCRIPTIONS[role]}
      value={formValues.reasoningEfforts[role]}
      onChange={(effort) => handleReasoningEffortChange(role, effort)}
      isLoading={isAnyLoading}
    />
  );

  /** One role's timeout, on the line beneath its model. */
  const timeoutControl = (role: InternalRole): ReactElement => (
    <TimeoutField
      label={TIMEOUT_LABELS[role]}
      inlineLabel="Timeout"
      description={TIMEOUT_DESCRIPTIONS[role]}
      seconds={formValues.timeouts[role]}
      onChange={(v) => handleTimeoutChange(role, v)}
      isLoading={isAnyLoading}
      layout="inline"
    />
  );

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
              generation, and other automated processes. Each model sits with
              the bounds on one call to it.
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
              controls={
                <>
                  {timeoutControl('system_prompt_reflection')}
                  {reasoningControl('system_prompt_reflection')}
                </>
              }
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
              controls={
                <>
                  {timeoutControl('evaluation_generation')}
                  {reasoningControl('evaluation_generation')}
                </>
              }
            />

            <ModelSelector
              label="Embedding Model"
              description="Model used for generating text embeddings for request clustering. Routing embeds every request, so keep its timeout short."
              recommendation="text-embedding-3-small (OpenAI) or gemini-embedding-001 (Google)"
              value={formValues.embedding_model_id}
              onChange={(v) => handleFieldChange('embedding_model_id', v)}
              modelOptions={embedModelOptions}
              isLoading={isAnyLoading}
              controls={timeoutControl('embedding')}
            />

            <ModelSelector
              label="Judge Model"
              description="Model used for evaluating and scoring responses during optimization. One judging attempt gets the timeout and the token budget; a reasoning model spends the budget thinking before it answers, and one that runs out answers nothing."
              recommendation="gpt-5.1, claude-sonnet-4-5, or claude-opus-4-5"
              value={formValues.judge_model_id}
              onChange={(v) => handleFieldChange('judge_model_id', v)}
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
              controls={
                <>
                  {timeoutControl('judge')}
                  <BoundedNumberField
                    label={JUDGE_MAX_TOKENS_LABEL}
                    inlineLabel="Token budget"
                    description={JUDGE_MAX_TOKENS_DESCRIPTION}
                    value={formValues.judge_max_tokens}
                    onChange={handleJudgeMaxTokensChange}
                    min={MIN_JUDGE_MAX_TOKENS}
                    max={MAX_JUDGE_MAX_TOKENS}
                    unit="tokens"
                    isLoading={isAnyLoading}
                    layout="inline"
                  />
                  {reasoningControl('judge')}
                </>
              }
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
              description="Model that makes the call. A fast model serves best; it only has to name a skill or none, and a request that matches no skill closely waits for the answer."
              recommendation="gpt-5-mini or claude-haiku-4-5"
              value={formValues.skill_arbiter_model_id}
              onChange={(v) => handleFieldChange('skill_arbiter_model_id', v)}
              modelOptions={textModelOptions}
              isLoading={isAnyLoading}
              required={false}
              emptyOption="Same as System Prompt Reflection"
              controls={
                <>
                  {timeoutControl('skill_arbiter')}
                  {reasoningControl('skill_arbiter')}
                </>
              }
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
              controls={
                <>
                  {timeoutControl('intent_compaction')}
                  {reasoningControl('intent_compaction')}
                </>
              }
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
