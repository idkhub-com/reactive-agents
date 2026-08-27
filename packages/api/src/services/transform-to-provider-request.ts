import { providerConfigs } from '@api/ai-providers';
import { GatewayError } from '@api/errors/gateway';
import type { AIProviderFunctionConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type {
  SuperAgentsRequestBody,
  SuperAgentsRequestData,
} from '@shared/types/api/request/body';
import type { SuperAgentsTarget } from '@shared/types/api/request/headers';
import type {
  ChatCompletionParameterTransformFunction,
  ParameterConfig,
  ParameterValueTypes,
} from '@shared/types/api/response/body';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import type { AIProvider } from '@shared/types/constants';

/**
 * Helper function to set a nested property in an object.
 * Guards against prototype pollution by checking each property name inline.
 */
function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');

  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // Guard against prototype pollution at each step
    if (
      part === '__proto__' ||
      part === 'constructor' ||
      part === 'prototype'
    ) {
      return;
    }
    if (!Object.hasOwn(current, part)) {
      current[part] = Object.create(null);
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  // Guard against prototype pollution for the final property
  if (
    lastPart === '__proto__' ||
    lastPart === 'constructor' ||
    lastPart === 'prototype'
  ) {
    return;
  }
  current[lastPart] = value;
}

const getValue = (
  configParam: string,
  saRequestBody: SuperAgentsRequestBody,
  paramConfig: ParameterConfig,
): ParameterValueTypes => {
  let value = saRequestBody[
    configParam as keyof typeof saRequestBody
  ] as ParameterValueTypes;

  // If a transformation is defined for this parameter, apply it
  if (paramConfig.transform) {
    value = (paramConfig.transform as ChatCompletionParameterTransformFunction)(
      saRequestBody as ChatCompletionRequestBody,
    );
  }

  if (
    value === 'sa-default' &&
    paramConfig &&
    paramConfig.default !== undefined
  ) {
    if (typeof paramConfig.default === 'function') {
      throw new GatewayError(
        `Default value for ${configParam} is a function, but it should be a string, number, boolean, or object`,
      );
    }

    // Set the transformed parameter to the default value
    value = paramConfig.default;
  }

  // If a minimum is defined for this parameter and the value is less than this, set the value to the minimum
  // Also, we should only do this comparison if value is of type 'number'
  if (
    typeof value === 'number' &&
    paramConfig &&
    paramConfig.min !== undefined &&
    value < paramConfig.min
  ) {
    value = paramConfig.min;
  }

  // If a maximum is defined for this parameter and the value is more than this, set the value to the maximum
  // Also, we should only do this comparison if value is of type 'number'
  else if (
    typeof value === 'number' &&
    paramConfig &&
    paramConfig.max !== undefined &&
    value > paramConfig.max
  ) {
    value = paramConfig.max;
  }

  return value;
};

export const transformUsingProviderConfig = (
  providerConfig: AIProviderFunctionConfig,
  saRequestBody: SuperAgentsRequestBody,
  saTarget: SuperAgentsTarget,
): Record<string, unknown> => {
  const transformedRequest: Record<string, unknown> = {};

  // For each parameter in the provider's configuration
  for (const configParam in providerConfig) {
    // Get the config for this parameter
    let paramConfigs = providerConfig[configParam];
    if (!Array.isArray(paramConfigs)) {
      paramConfigs = [paramConfigs];
    }

    for (const paramConfig of paramConfigs) {
      // If the parameter is present in the incoming request body
      if (configParam in saRequestBody) {
        // Get the value for this parameter
        const value = getValue(configParam, saRequestBody, paramConfig);

        // Set the transformed parameter to the validated value
        setNestedProperty(
          transformedRequest,
          paramConfig?.param as string,
          value,
        );
      }
      // If the parameter is not present in the incoming request body
      else {
        // Check if there's a transform function - if so, call it
        // This handles cases like Anthropic's __json_output tool that needs to be added
        // when response_format is present, even though tools is not required
        if (paramConfig?.transform) {
          const value = getValue(configParam, saRequestBody, paramConfig);
          // Only set if the transform returned a non-null/undefined value
          if (value !== null && value !== undefined) {
            setNestedProperty(transformedRequest, paramConfig.param, value);
          }
        }
        // Otherwise, if it's required and has a default, use the default
        else if (paramConfig?.required && paramConfig?.default !== undefined) {
          let value: unknown;
          if (typeof paramConfig.default === 'function') {
            value = paramConfig.default({ saRequestBody, saTarget });
          } else {
            value = paramConfig.default;
          }
          // Set the transformed parameter to the default value
          setNestedProperty(transformedRequest, paramConfig.param, value);
        }
      }
    }
  }

  return transformedRequest;
};

/**
 * Transforms the request body to match the structure required by the AI provider.
 * It also ensures the values for each parameter are within the minimum and maximum
 * constraints defined in the provider's configuration. If a required parameter is missing,
 * it assigns the default value from the provider's configuration.
 *
 * @throws {GatewayError} If the provider is not supported.
 */
const transformToProviderRequestJSON = (
  provider: AIProvider,
  saRequestBody: SuperAgentsRequestBody,
  fn: FunctionName,
  saTarget: SuperAgentsTarget,
): Record<string, unknown> => {
  // Get the configuration for the specified provider
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let functionConfig: AIProviderFunctionConfig | undefined;
  if (providerConfig.getConfig) {
    functionConfig = providerConfig.getConfig(saRequestBody)[
      fn
    ] as AIProviderFunctionConfig;
  } else {
    functionConfig = providerConfig[fn] as AIProviderFunctionConfig;
  }

  if (!functionConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  return transformUsingProviderConfig(functionConfig, saRequestBody, saTarget);
};

const transformToProviderRequestFormData = (
  provider: AIProvider,
  saRequestBody: SuperAgentsRequestBody,
  fn: FunctionName,
  saTarget: SuperAgentsTarget,
): FormData => {
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let functionConfig: AIProviderFunctionConfig | undefined;
  if (providerConfig?.getConfig) {
    const overrideConfig = providerConfig.getConfig(saRequestBody);
    functionConfig = overrideConfig[fn] as AIProviderFunctionConfig;
  } else {
    functionConfig = providerConfig[fn] as AIProviderFunctionConfig;
  }
  const formData = new FormData();
  for (const configParam in functionConfig) {
    let paramConfigs = functionConfig[configParam];
    if (!Array.isArray(paramConfigs)) {
      paramConfigs = [paramConfigs];
    }
    for (const paramConfig of paramConfigs) {
      if (configParam in saRequestBody) {
        const value = getValue(configParam, saRequestBody, paramConfig);

        formData.append(paramConfig.param, value as unknown as string);
      } else if (paramConfig?.required && paramConfig?.default !== undefined) {
        let value: unknown;
        if (typeof paramConfig.default === 'function') {
          value = paramConfig.default({ saRequestBody, saTarget });
        } else {
          value = paramConfig.default;
        }
        formData.append(paramConfig.param, value?.toString() ?? '');
      }
    }
  }
  return formData;
};

const transformToProviderRequestReadableStream = (
  provider: AIProvider,
  body: ReadableStream,
  fn: FunctionName,
): ReadableStream => {
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let transformers: Record<string, unknown> | undefined;
  if (providerConfig.getConfig) {
    transformers = providerConfig.getConfig(undefined).requestTransforms;
  } else {
    transformers = providerConfig.requestTransforms;
  }

  if (!transformers) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  const transformer = transformers[fn] as (
    body: ReadableStream,
  ) => ReadableStream;
  return transformer(body);
};

/**
 * Transforms the request parameters to the format expected by the provider.
 */
export const transformToProviderRequest = (
  aiProvider: AIProvider,
  saTarget: SuperAgentsTarget,
  saRequestData: SuperAgentsRequestData,
): Record<string, unknown> | ReadableStream | FormData | ArrayBuffer => {
  // this returns a ReadableStream
  if (saRequestData.functionName === FunctionName.UPLOAD_FILE) {
    if (!(saRequestData.requestBody instanceof ReadableStream)) {
      throw new GatewayError(
        `Expected a ReadableStream for ${saRequestData.functionName} but got ${typeof saRequestData.requestBody}`,
      );
    }

    return transformToProviderRequestReadableStream(
      aiProvider,
      saRequestData.requestBody as ReadableStream,
      saRequestData.functionName,
    );
  }

  if (
    saRequestData.requestBody instanceof FormData ||
    saRequestData.requestBody instanceof ArrayBuffer
  )
    return saRequestData.requestBody;

  if (saRequestData.requestBody instanceof ReadableStream) {
    throw new GatewayError(
      `Unsupported request body type for ${saRequestData.functionName}: ${typeof saRequestData.requestBody}`,
    );
  }

  if (saRequestData.functionName === FunctionName.PROXY) {
    return saRequestData.requestBody;
  }

  const providerConfig = providerConfigs[aiProvider];

  if (!providerConfig) {
    throw new GatewayError(
      `${saRequestData.functionName} is not supported by ${aiProvider}`,
    );
  }

  const providerAPIConfig = providerConfig.api;

  if (providerAPIConfig.transformToFormData?.({ saRequestData })) {
    return transformToProviderRequestFormData(
      aiProvider,
      saRequestData.requestBody,
      saRequestData.functionName,
      saTarget,
    );
  }

  return transformToProviderRequestJSON(
    aiProvider,
    saRequestData.requestBody,
    saRequestData.functionName,
    saTarget,
  );
};

export default transformToProviderRequest;
