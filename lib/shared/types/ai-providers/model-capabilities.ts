/**
 * Model capability validation types for AI providers.
 *
 * This module defines schemas for declaring which parameters and features
 * are supported by specific models across different AI providers.
 */

import { z } from 'zod';

/**
 * Model parameters as a const array for use with z.enum.
 */
const MODEL_PARAMETERS = [
  'temperature',
  'top_p',
  'max_tokens',
  'max_completion_tokens',
  'frequency_penalty',
  'presence_penalty',
  'stop',
  'seed',
  'reasoning_effort',
  'thinking',
  'logprobs',
  'top_logprobs',
] as const;

/**
 * Zod enum schema for model parameters.
 */
export const ModelParameterSchema = z.enum(MODEL_PARAMETERS);

/**
 * Inferred type from the schema.
 */
export type ModelParameter = z.infer<typeof ModelParameterSchema>;

/**
 * Enum-like object for backward compatibility.
 */
export const ModelParameter = {
  TEMPERATURE: 'temperature',
  TOP_P: 'top_p',
  MAX_TOKENS: 'max_tokens',
  MAX_COMPLETION_TOKENS: 'max_completion_tokens',
  FREQUENCY_PENALTY: 'frequency_penalty',
  PRESENCE_PENALTY: 'presence_penalty',
  STOP: 'stop',
  SEED: 'seed',
  REASONING_EFFORT: 'reasoning_effort',
  THINKING: 'thinking',
  LOGPROBS: 'logprobs',
  TOP_LOGPROBS: 'top_logprobs',
} as const;

/**
 * Zod schema for model parameters array.
 */
const ModelParameterArray = z.array(ModelParameterSchema);

/**
 * Zod schema for parameter mapping (e.g., legacy parameter remapping).
 * Uses z.string() keys to allow partial mappings.
 */
const ParameterMapping = z.record(z.string(), ModelParameterSchema);

/**
 * Zod schema for parameter range configuration.
 * Defines the valid range for a parameter (min/max values).
 */
export const ParameterRange = z.object({
  /**
   * Minimum value for this parameter.
   */
  min: z.number(),

  /**
   * Maximum value for this parameter.
   */
  max: z.number(),
});

export type ParameterRange = z.infer<typeof ParameterRange>;

/**
 * Zod schema for parameter ranges mapping.
 * Maps parameter names to their valid ranges.
 */
const ParameterRanges = z.record(z.string(), ParameterRange);

/**
 * Endpoint-specific parameter configuration schema.
 */
export const EndpointParameterConfig = z.object({
  /**
   * Parameters that are NOT supported for this endpoint.
   * If undefined, all parameters are assumed to be supported.
   */
  unsupportedParameters: ModelParameterArray.optional(),

  /**
   * Parameters that ARE supported for this endpoint.
   * If defined, only these parameters will be allowed.
   * Takes precedence over unsupportedParameters.
   */
  supportedParameters: ModelParameterArray.optional(),

  /**
   * Parameter remapping for this endpoint.
   * For example, o1 models use 'max_completion_tokens' instead of 'max_tokens'.
   */
  legacyParameterMapping: ParameterMapping.optional(),

  /**
   * Parameter ranges for this endpoint.
   * Defines the valid min/max values for each parameter.
   * Used to transform normalized 0-1 values to the model's expected range.
   *
   * Example:
   * ```typescript
   * parameterRanges: {
   *   temperature: { min: 0, max: 2 },    // OpenAI supports 0-2
   *   frequency_penalty: { min: -2, max: 2 }  // OpenAI supports -2 to 2
   * }
   * ```
   */
  parameterRanges: ParameterRanges.optional(),
});

export type EndpointParameterConfig = z.infer<typeof EndpointParameterConfig>;

/**
 * Configuration for a specific model's capabilities.
 */
export const ModelCapability = z.object({
  /**
   * Model identifier (e.g., 'gpt-4', 'grok-3-mini-beta').
   * Can use wildcards: 'gpt-4*' matches all GPT-4 variants.
   * Can also be a RegExp for complex patterns.
   */
  modelPattern: z.union([z.string(), z.instanceof(RegExp)]),

  /**
   * Endpoint-specific parameter configurations.
   * Keys should be FunctionName enum values.
   *
   * If not specified for an endpoint, all parameters are assumed supported.
   *
   * Example:
   * ```typescript
   * endpointConfigs: {
   *   [FunctionName.CHAT_COMPLETE]: {
   *     unsupportedParameters: [ModelParameter.REASONING_EFFORT]
   *   },
   *   [FunctionName.COMPLETE]: {
   *     supportedParameters: [ModelParameter.TEMPERATURE, ModelParameter.MAX_TOKENS]
   *   }
   * }
   * ```
   */
  endpointConfigs: z.record(z.string(), EndpointParameterConfig),
});

export type ModelCapability = z.infer<typeof ModelCapability>;

/**
 * Provider-specific model capabilities configuration.
 */
export const ProviderModelCapabilities = z.object({
  /**
   * AI provider identifier.
   */
  provider: z.string(),

  /**
   * Default parameters that are supported by all models from this provider.
   * Individual model configurations can override this.
   */
  defaultSupportedParameters: ModelParameterArray.optional(),

  /**
   * Default parameters that are NOT supported by any models from this provider.
   */
  defaultUnsupportedParameters: ModelParameterArray.optional(),

  /**
   * Default parameter ranges for all models from this provider.
   * Individual model configurations can override specific ranges.
   *
   * Example:
   * ```typescript
   * defaultParameterRanges: {
   *   temperature: { min: 0, max: 2 },
   *   frequency_penalty: { min: -2, max: 2 }
   * }
   * ```
   */
  defaultParameterRanges: ParameterRanges.optional(),

  /**
   * Model-specific capability configurations.
   */
  models: z.array(ModelCapability),
});

export type ProviderModelCapabilities = z.infer<
  typeof ProviderModelCapabilities
>;

/**
 * Result of parameter validation for a specific model.
 */
export const ParameterValidationResult = z.object({
  /**
   * Whether the parameter is supported.
   */
  isSupported: z.boolean(),

  /**
   * The parameter name to use (may be remapped for legacy models).
   */
  parameterName: ModelParameterSchema.optional(),

  /**
   * The transformed value (if parameter range mapping was applied).
   * If undefined, use the original value.
   */
  transformedValue: z.number().optional(),

  /**
   * The parameter range used for transformation (if applicable).
   */
  parameterRange: ParameterRange.optional(),

  /**
   * Reason why the parameter is not supported (if applicable).
   */
  reason: z.string().optional(),

  /**
   * Warning message (e.g., for deprecated parameters).
   */
  warning: z.string().optional(),
});

export type ParameterValidationResult = z.infer<
  typeof ParameterValidationResult
>;
