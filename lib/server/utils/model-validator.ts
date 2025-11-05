/**
 * Model capability validation utility.
 *
 * This service validates whether specific parameters are supported by AI models
 * and handles parameter remapping for legacy models.
 */

import type {
  ModelCapability,
  ParameterRange,
  ParameterValidationResult,
  ProviderModelCapabilities,
} from '@shared/types/ai-providers/model-capabilities';
import { ModelParameter } from '@shared/types/ai-providers/model-capabilities';
import type { FunctionName } from '@shared/types/api/request';
import type { AIProvider } from '@shared/types/constants';

/**
 * Registry of provider model capabilities.
 */
const providerCapabilitiesRegistry = new Map<
  string,
  ProviderModelCapabilities
>();

/**
 * Register model capabilities for a provider.
 */
export function registerProviderCapabilities(
  capabilities: ProviderModelCapabilities,
): void {
  providerCapabilitiesRegistry.set(capabilities.provider, capabilities);
}

/**
 * Parse model identifier to extract provider and model name.
 * Supports formats like:
 * - "gpt-4" (simple model name)
 * - "openai/gpt-4" (OpenRouter format)
 * - "anthropic/claude-3-opus" (OpenRouter format)
 */
export function parseModelIdentifier(
  modelId: string,
  defaultProvider?: AIProvider,
): { provider: string | undefined; modelName: string } {
  // Check if model ID contains provider prefix (OpenRouter format)
  const parts = modelId.split('/');

  if (parts.length === 2) {
    return {
      provider: parts[0],
      modelName: parts[1],
    };
  }

  return {
    provider: defaultProvider,
    modelName: modelId,
  };
}

/**
 * Check if a model pattern matches a model name.
 * Supports:
 * - Exact match: "gpt-4"
 * - Wildcard: "gpt-4*" matches "gpt-4-turbo", "gpt-4o", etc.
 * - RegExp: custom regex patterns
 */
function matchesModelPattern(
  modelName: string,
  pattern: string | RegExp,
): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(modelName);
  }

  // Convert wildcard pattern to regex
  if (pattern.includes('*')) {
    const regexPattern = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(modelName);
  }

  // Exact match
  return modelName === pattern;
}

/**
 * Find model capability configuration for a specific model.
 */
function findModelCapability(
  providerCapabilities: ProviderModelCapabilities,
  modelName: string,
): ModelCapability | undefined {
  return providerCapabilities.models.find((modelCap) =>
    matchesModelPattern(modelName, modelCap.modelPattern),
  );
}

/**
 * Validate if a parameter is supported by a model for a specific endpoint.
 */
export function validateParameter(
  provider: AIProvider | string,
  modelId: string,
  parameter: ModelParameter,
  functionName?: FunctionName,
): ParameterValidationResult {
  // Parse model identifier (handles OpenRouter format)
  const { provider: parsedProvider, modelName } = parseModelIdentifier(
    modelId,
    provider as AIProvider,
  );

  const effectiveProvider = parsedProvider || provider;

  // Get provider capabilities
  const providerCapabilities =
    providerCapabilitiesRegistry.get(effectiveProvider);

  if (!providerCapabilities) {
    // No capabilities registered - assume supported
    return {
      isSupported: true,
      parameterName: parameter,
    };
  }

  // Find model-specific capability
  const modelCapability = findModelCapability(providerCapabilities, modelName);

  let isSupported = true;
  let parameterName = parameter;
  let reason: string | undefined;
  let warning: string | undefined;

  if (modelCapability) {
    // Check if we have endpoint-specific configuration
    if (!functionName) {
      // No function name provided - assume all parameters supported
      return {
        isSupported: true,
        parameterName: parameter,
      };
    }

    const endpointConfig = modelCapability.endpointConfigs[functionName];

    if (!endpointConfig) {
      // No config for this endpoint - assume all parameters supported
      return {
        isSupported: true,
        parameterName: parameter,
      };
    }

    // Check endpoint-specific supported/unsupported parameters
    const {
      supportedParameters,
      unsupportedParameters,
      legacyParameterMapping,
    } = endpointConfig;

    // Check if parameter is explicitly supported
    if (supportedParameters) {
      isSupported = supportedParameters.includes(parameter);
      if (!isSupported) {
        reason = `Parameter '${parameter}' is not in the supported parameters list for endpoint '${functionName}' on model '${modelName}'`;
      }
    }
    // Check if parameter is explicitly unsupported
    else if (unsupportedParameters) {
      isSupported = !unsupportedParameters.includes(parameter);
      if (!isSupported) {
        reason = `Parameter '${parameter}' is not supported by endpoint '${functionName}' on model '${modelName}'`;
      }
    }

    // Check for parameter remapping (legacy models)
    if (isSupported && legacyParameterMapping) {
      const mappedParameter = legacyParameterMapping[parameter as string];
      if (mappedParameter !== undefined) {
        parameterName = mappedParameter;
      }
    }
  } else {
    // No model-specific config, check provider defaults
    if (providerCapabilities.defaultSupportedParameters) {
      isSupported =
        providerCapabilities.defaultSupportedParameters.includes(parameter);
      if (!isSupported) {
        reason = `Parameter '${parameter}' is not in the default supported parameters for provider '${effectiveProvider}'`;
      }
    } else if (providerCapabilities.defaultUnsupportedParameters) {
      isSupported =
        !providerCapabilities.defaultUnsupportedParameters.includes(parameter);
      if (!isSupported) {
        reason = `Parameter '${parameter}' is not supported by provider '${effectiveProvider}'`;
      }
    }
  }

  return {
    isSupported,
    parameterName: isSupported ? parameterName : undefined,
    reason,
    warning,
  };
}

/**
 * Get the parameter range for a specific parameter on a model/endpoint.
 */
function getParameterRange(
  providerCapabilities: ProviderModelCapabilities,
  modelCapability: ModelCapability | undefined,
  parameter: ModelParameter,
  functionName?: FunctionName,
): ParameterRange | undefined {
  // Check endpoint-specific ranges first
  if (modelCapability && functionName) {
    const endpointConfig = modelCapability.endpointConfigs[functionName];
    if (endpointConfig?.parameterRanges) {
      const range = endpointConfig.parameterRanges[parameter];
      if (range) return range;
    }
  }

  // Fall back to provider default ranges
  if (providerCapabilities.defaultParameterRanges) {
    return providerCapabilities.defaultParameterRanges[parameter];
  }

  return undefined;
}

/**
 * Transform a normalized value (0-1) to the model's expected range.
 */
export function transformParameterValue(
  normalizedValue: number,
  range: ParameterRange,
): number {
  const { min, max } = range;
  return min + normalizedValue * (max - min);
}

/**
 * Validate and optionally transform a parameter value based on model capabilities.
 */
export function validateAndTransformParameter(
  provider: AIProvider | string,
  modelId: string,
  parameter: ModelParameter,
  value: number,
  functionName?: FunctionName,
  shouldTransform = true,
): ParameterValidationResult {
  // First validate if parameter is supported
  const validation = validateParameter(
    provider,
    modelId,
    parameter,
    functionName,
  );

  if (!validation.isSupported) {
    return validation;
  }

  // Parse model identifier
  const { provider: parsedProvider, modelName } = parseModelIdentifier(
    modelId,
    provider as AIProvider,
  );

  const effectiveProvider = parsedProvider || provider;

  // Get provider capabilities
  const providerCapabilities =
    providerCapabilitiesRegistry.get(effectiveProvider);

  if (!providerCapabilities) {
    return validation;
  }

  // Find model-specific capability
  const modelCapability = findModelCapability(providerCapabilities, modelName);

  // Get parameter range
  const parameterRange = getParameterRange(
    providerCapabilities,
    modelCapability,
    parameter,
    functionName,
  );

  // If no range defined or transformation disabled, return as-is
  if (!parameterRange || !shouldTransform) {
    return {
      ...validation,
      parameterRange,
    };
  }

  // Transform the value
  const transformedValue = transformParameterValue(value, parameterRange);

  return {
    ...validation,
    transformedValue,
    parameterRange,
  };
}

/**
 * Get all supported parameters for a model and optional endpoint.
 */
export function getSupportedParameters(
  provider: AIProvider | string,
  modelId: string,
  functionName?: FunctionName,
): ModelParameter[] {
  const { provider: parsedProvider, modelName } = parseModelIdentifier(
    modelId,
    provider as AIProvider,
  );

  const effectiveProvider = parsedProvider || provider;

  const providerCapabilities =
    providerCapabilitiesRegistry.get(effectiveProvider);

  if (!providerCapabilities) {
    // Return all parameters if no capabilities registered
    return Object.values(ModelParameter);
  }

  const modelCapability = findModelCapability(providerCapabilities, modelName);

  if (modelCapability) {
    // Check if we have function name and endpoint config
    if (!functionName) {
      // No function name - return all parameters
      return Object.values(ModelParameter);
    }

    const endpointConfig = modelCapability.endpointConfigs[functionName];

    if (!endpointConfig) {
      // No config for this endpoint - return all parameters
      return Object.values(ModelParameter);
    }

    // Use endpoint-specific supported parameters
    if (endpointConfig.supportedParameters) {
      return endpointConfig.supportedParameters;
    }

    // Use endpoint-specific unsupported parameters
    if (endpointConfig.unsupportedParameters) {
      return Object.values(ModelParameter).filter(
        (param) => !endpointConfig.unsupportedParameters!.includes(param),
      );
    }

    // No restrictions for this endpoint
    return Object.values(ModelParameter);
  }

  // Use provider defaults
  if (providerCapabilities.defaultSupportedParameters) {
    return providerCapabilities.defaultSupportedParameters;
  }

  if (providerCapabilities.defaultUnsupportedParameters) {
    return Object.values(ModelParameter).filter(
      (param) =>
        !providerCapabilities.defaultUnsupportedParameters!.includes(param),
    );
  }

  return Object.values(ModelParameter);
}

/**
 * Validate multiple parameters at once.
 */
export function validateParameters(
  provider: AIProvider | string,
  modelId: string,
  parameters: ModelParameter[],
  functionName?: FunctionName,
): Map<ModelParameter, ParameterValidationResult> {
  const results = new Map<ModelParameter, ParameterValidationResult>();

  for (const parameter of parameters) {
    results.set(
      parameter,
      validateParameter(provider, modelId, parameter, functionName),
    );
  }

  return results;
}
