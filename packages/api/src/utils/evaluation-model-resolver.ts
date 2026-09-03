import { isAPIKeyRequiredForProvider } from '@api/ai-providers';
import type { LLMJudgeModelConfig } from '@api/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { warn } from '@shared/console-logging';
import type { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import type { AIProvider } from '@shared/types/constants';
import type {
  Model,
  SkillOptimizationEvaluation,
  SystemSettings,
} from '@shared/types/data';

/**
 * Model configuration resolved from system settings or evaluation.
 */
export interface ResolvedModelConfig {
  model: string;
  provider: AIProvider;
  /**
   * The provider's API key, where it has one. Self-hosted providers such as
   * Ollama are configured without a key and are called without one.
   */
  apiKey?: string;
  /**
   * The provider's configured base URL, where it has one.
   *
   * Internal skills call back through the gateway with a target naming only a
   * provider and a model, so without this a self-hosted provider is sent to its
   * vendor default -- Ollama to `http://localhost:11434` -- no matter what the
   * user configured. The failure is quiet: the call cannot connect, the error
   * is logged, and optimization simply stops happening.
   */
  customHost?: string;
  /**
   * How long one attempt at this call may take, from the timeout that sits
   * beside the model in system settings.
   *
   * It rides along with the model because every caller that needs one needs
   * the other, and resolving them together is what keeps a new internal skill
   * from quietly inheriting the OpenAI client's ten-minute default. Absent
   * only from a model resolved by id alone, which has no setting of its own.
   */
  timeoutMs?: number;
  /**
   * How hard this role's model may think before it answers, from the effort
   * that sits beside it in system settings. Null or absent sends nothing and
   * leaves the model to its own default. Rides along for the same reason the
   * timeout does: a caller that resolves a model needs the bounds on it.
   */
  reasoningEffort?: ReasoningEffort | null;
}

/**
 * System settings model type for lookup.
 */
export type SystemSettingsModelType =
  | 'judge'
  | 'embedding'
  | 'system_prompt_reflection'
  | 'evaluation_generation'
  | 'skill_arbiter'
  | 'intent_compaction';

/**
 * Resolves a model configuration from a model ID.
 *
 * @param modelId - The model ID to resolve
 * @param connector - The storage connector to look up models
 * @param logPrefix - Prefix for log messages
 * @returns The model configuration or null if not found
 */
export async function resolveModelById(
  c: AppContext,
  modelId: string,
  connector: UserDataStorageConnector,
  logPrefix: string,
): Promise<ResolvedModelConfig | null> {
  // Look up the model
  const models = await connector.getModels(c, { id: modelId });
  if (models.length === 0) {
    warn(`[${logPrefix}] Model not found: ${modelId}`);
    return null;
  }
  const model = models[0];

  // Look up the provider to get the API key
  const providers = await connector.getAIProviderAPIKeys(c, {
    id: model.ai_provider_id,
  });
  if (providers.length === 0) {
    warn(
      `[${logPrefix}] Provider not found for model: ${model.ai_provider_id}`,
    );
    return null;
  }
  const providerConfig = providers[0];

  // Ensure we have an API key, for the providers that need one
  if (
    !providerConfig.api_key &&
    isAPIKeyRequiredForProvider(providerConfig.ai_provider)
  ) {
    warn(
      `[${logPrefix}] No API key configured for provider: ${model.ai_provider_id}`,
    );
    return null;
  }

  return {
    model: model.model_name,
    provider: providerConfig.ai_provider as AIProvider,
    apiKey: providerConfig.api_key ?? undefined,
    customHost: providerConfig.custom_fields?.custom_host as string | undefined,
  };
}

/**
 * Resolves a model configuration from system settings.
 *
 * @param modelType - The type of model to resolve from system settings
 * @param connector - The storage connector to look up models and settings
 * @param settings - The system settings, when the caller already read them
 * @returns The model configuration or null if not configured
 */
export async function resolveSystemSettingsModel(
  c: AppContext,
  modelType: SystemSettingsModelType,
  connector: UserDataStorageConnector,
  settings?: SystemSettings,
): Promise<ResolvedModelConfig | null> {
  const logPrefix = `MODEL_RESOLVER_${modelType.toUpperCase()}`;
  const systemSettings = settings ?? (await connector.getSystemSettings(c));

  let modelId: string | null = null;
  let configured = `${modelType}_model_id`;
  // Each model setting has its bounds beside it, and they are resolved
  // together so a caller cannot take one without the others.
  const roleOptions = systemSettings.options[modelType];
  const timeoutMs = roleOptions.timeout_ms;
  // Every role but embedding has an effort; an embedding has nothing to think
  // about, so its options object carries none.
  const reasoningEffort =
    'reasoning_effort' in roleOptions ? roleOptions.reasoning_effort : null;

  switch (modelType) {
    case 'judge':
      modelId = systemSettings.judge_model_id;
      break;
    case 'embedding':
      modelId = systemSettings.embedding_model_id;
      break;
    case 'system_prompt_reflection':
      modelId = systemSettings.system_prompt_reflection_model_id;
      break;
    case 'evaluation_generation':
      modelId = systemSettings.evaluation_generation_model_id;
      break;
    case 'skill_arbiter':
      // The arbiter has a model of its own only when one is chosen for it;
      // otherwise it borrows the reflection model, as it always did.
      modelId =
        systemSettings.skill_arbiter_model_id ??
        systemSettings.system_prompt_reflection_model_id;
      configured =
        'skill_arbiter_model_id or system_prompt_reflection_model_id';
      break;
    case 'intent_compaction':
      // As with the arbiter: a model of its own only when one is chosen for
      // it, and the reflection model otherwise.
      modelId =
        systemSettings.intent_compaction_model_id ??
        systemSettings.system_prompt_reflection_model_id;
      configured =
        'intent_compaction_model_id or system_prompt_reflection_model_id';
      break;
  }

  if (!modelId) {
    warn(`[${logPrefix}] No ${configured} configured in system settings`);
    return null;
  }

  const resolved = await resolveModelById(c, modelId, connector, logPrefix);
  return resolved && { ...resolved, timeoutMs, reasoningEffort };
}

/**
 * Resolves the judge with everything a judging call needs from settings: the
 * model, its timeout and reasoning effort, and the completion budget that
 * lets a thinking model finish its answer.
 */
export async function resolveJudgeModelConfig(
  c: AppContext,
  connector: UserDataStorageConnector,
  settings?: SystemSettings,
): Promise<LLMJudgeModelConfig | null> {
  const systemSettings = settings ?? (await connector.getSystemSettings(c));
  const resolved = await resolveSystemSettingsModel(
    c,
    'judge',
    connector,
    systemSettings,
  );
  // The effort arrives with the model, like every role's; only the budget is
  // the judge's own.
  return (
    resolved && {
      ...resolved,
      maxTokens: systemSettings.options.judge.max_tokens,
    }
  );
}

/**
 * Resolves the model configuration for an evaluation.
 *
 * Resolution order:
 * 1. If evaluation.model_id is set, use that model
 * 2. Otherwise, use the judge_model_id from system settings
 *
 * @param evaluation - The evaluation to resolve model for
 * @param connector - The storage connector to look up models and settings
 * @returns The model configuration or null if no model could be resolved
 */
export async function resolveEvaluationModelConfig(
  c: AppContext,
  evaluation: SkillOptimizationEvaluation,
  connector: UserDataStorageConnector,
): Promise<LLMJudgeModelConfig | null> {
  const logPrefix = 'EVAL_MODEL_RESOLVER';

  // If evaluation has a model_id, use it. A model named by an evaluation has
  // no timeout or token budget of its own, so it is judged under the judge's.
  if (evaluation.model_id) {
    const resolved = await resolveModelById(
      c,
      evaluation.model_id,
      connector,
      logPrefix,
    );
    if (!resolved) {
      return null;
    }
    const { options } = await connector.getSystemSettings(c);
    return {
      ...resolved,
      timeoutMs: options.judge.timeout_ms,
      maxTokens: options.judge.max_tokens,
      reasoningEffort: options.judge.reasoning_effort,
    };
  }

  // Fall back to system settings judge_model_id
  return await resolveJudgeModelConfig(c, connector);
}

/**
 * Embedding model configuration with dimensions.
 */
export interface EmbeddingModelConfig {
  modelId: string;
  model: Model;
  dimensions: number;
  /** How long one embedding call may take, from system settings. */
  timeoutMs: number;
}

/**
 * Resolves the embedding model configuration from system settings.
 *
 * @param connector - The storage connector to look up models and settings
 * @returns The embedding model config or null if not configured
 */
export async function resolveEmbeddingModelConfig(
  c: AppContext,
  connector: UserDataStorageConnector,
): Promise<EmbeddingModelConfig | null> {
  const logPrefix = 'EMBEDDING_MODEL_RESOLVER';
  const systemSettings = await connector.getSystemSettings(c);

  if (!systemSettings.embedding_model_id) {
    warn(`[${logPrefix}] No embedding_model_id configured in system settings`);
    return null;
  }

  const models = await connector.getModels(c, {
    id: systemSettings.embedding_model_id,
  });
  if (models.length === 0) {
    warn(
      `[${logPrefix}] Embedding model not found: ${systemSettings.embedding_model_id}`,
    );
    return null;
  }

  const model = models[0];

  if (!model.embedding_dimensions) {
    warn(
      `[${logPrefix}] Embedding model ${model.model_name} has no dimensions configured`,
    );
    return null;
  }

  return {
    modelId: model.id,
    model,
    dimensions: model.embedding_dimensions,
    timeoutMs: systemSettings.options.embedding.timeout_ms,
  };
}
