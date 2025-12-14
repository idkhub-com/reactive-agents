import type { LLMJudgeModelConfig } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import { warn } from '@shared/console-logging';
import type { AIProvider } from '@shared/types/constants';
import type { Model, SkillOptimizationEvaluation } from '@shared/types/data';

/**
 * Model configuration resolved from system settings or evaluation.
 */
export interface ResolvedModelConfig {
  model: string;
  provider: AIProvider;
  apiKey: string;
}

/**
 * System settings model type for lookup.
 */
export type SystemSettingsModelType =
  | 'judge'
  | 'embedding'
  | 'system_prompt_reflection'
  | 'evaluation_generation';

/**
 * Resolves a model configuration from a model ID.
 *
 * @param modelId - The model ID to resolve
 * @param connector - The storage connector to look up models
 * @param logPrefix - Prefix for log messages
 * @returns The model configuration or null if not found
 */
async function resolveModelById(
  modelId: string,
  connector: UserDataStorageConnector,
  logPrefix: string,
): Promise<ResolvedModelConfig | null> {
  // Look up the model
  const models = await connector.getModels({ id: modelId });
  if (models.length === 0) {
    warn(`[${logPrefix}] Model not found: ${modelId}`);
    return null;
  }
  const model = models[0];

  // Look up the provider to get the API key
  const providers = await connector.getAIProviderAPIKeys({
    id: model.ai_provider_id,
  });
  if (providers.length === 0) {
    warn(
      `[${logPrefix}] Provider not found for model: ${model.ai_provider_id}`,
    );
    return null;
  }
  const providerConfig = providers[0];

  // Ensure we have an API key
  if (!providerConfig.api_key) {
    warn(
      `[${logPrefix}] No API key configured for provider: ${model.ai_provider_id}`,
    );
    return null;
  }

  return {
    model: model.model_name,
    provider: providerConfig.ai_provider as AIProvider,
    apiKey: providerConfig.api_key,
  };
}

/**
 * Resolves a model configuration from system settings.
 *
 * @param modelType - The type of model to resolve from system settings
 * @param connector - The storage connector to look up models and settings
 * @returns The model configuration or null if not configured
 */
export async function resolveSystemSettingsModel(
  modelType: SystemSettingsModelType,
  connector: UserDataStorageConnector,
): Promise<ResolvedModelConfig | null> {
  const logPrefix = `MODEL_RESOLVER_${modelType.toUpperCase()}`;
  const systemSettings = await connector.getSystemSettings();

  let modelId: string | null = null;

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
  }

  if (!modelId) {
    warn(
      `[${logPrefix}] No ${modelType}_model_id configured in system settings`,
    );
    return null;
  }

  return resolveModelById(modelId, connector, logPrefix);
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
  evaluation: SkillOptimizationEvaluation,
  connector: UserDataStorageConnector,
): Promise<LLMJudgeModelConfig | null> {
  const logPrefix = 'EVAL_MODEL_RESOLVER';

  // If evaluation has a model_id, use it
  if (evaluation.model_id) {
    return await resolveModelById(evaluation.model_id, connector, logPrefix);
  }

  // Fall back to system settings judge_model_id
  return await resolveSystemSettingsModel('judge', connector);
}

/**
 * Embedding model configuration with dimensions.
 */
export interface EmbeddingModelConfig {
  modelId: string;
  model: Model;
  dimensions: number;
}

/**
 * Resolves the embedding model configuration from system settings.
 *
 * @param connector - The storage connector to look up models and settings
 * @returns The embedding model config or null if not configured
 */
export async function resolveEmbeddingModelConfig(
  connector: UserDataStorageConnector,
): Promise<EmbeddingModelConfig | null> {
  const logPrefix = 'EMBEDDING_MODEL_RESOLVER';
  const systemSettings = await connector.getSystemSettings();

  if (!systemSettings.embedding_model_id) {
    warn(`[${logPrefix}] No embedding_model_id configured in system settings`);
    return null;
  }

  const models = await connector.getModels({
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
  };
}
