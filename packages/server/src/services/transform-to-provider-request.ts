import { providerConfigs } from '@server/ai-providers';
import { GatewayError } from '@server/errors/gateway';
import type { AIProviderFunctionConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type {
  ReactiveAgentsRequestBody,
  ReactiveAgentsRequestData,
} from '@shared/types/api/request/body';
import type { ReactiveAgentsTarget } from '@shared/types/api/request/headers';
import type {
  ChatCompletionParameterTransformFunction,
  ParameterConfig,
  ParameterValueTypes,
} from '@shared/types/api/response/body';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import type { AIProvider } from '@shared/types/constants';

/**
 * Helper function to set a nested property in an object.
 */
function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

const getValue = (
  configParam: string,
  raRequestBody: ReactiveAgentsRequestBody,
  paramConfig: ParameterConfig,
): ParameterValueTypes => {
  let value = raRequestBody[
    configParam as keyof typeof raRequestBody
  ] as ParameterValueTypes;

  // If a transformation is defined for this parameter, apply it
  if (paramConfig.transform) {
    value = (paramConfig.transform as ChatCompletionParameterTransformFunction)(
      raRequestBody as ChatCompletionRequestBody,
    );
  }

  if (
    value === 'ra-default' &&
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
  raRequestBody: ReactiveAgentsRequestBody,
  raTarget: ReactiveAgentsTarget,
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
      if (configParam in raRequestBody) {
        // Get the value for this parameter
        const value = getValue(configParam, raRequestBody, paramConfig);

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
          const value = getValue(configParam, raRequestBody, paramConfig);
          // Only set if the transform returned a non-null/undefined value
          if (value !== null && value !== undefined) {
            setNestedProperty(transformedRequest, paramConfig.param, value);
          }
        }
        // Otherwise, if it's required and has a default, use the default
        else if (paramConfig?.required && paramConfig?.default !== undefined) {
          let value: unknown;
          if (typeof paramConfig.default === 'function') {
            value = paramConfig.default({ raRequestBody, raTarget });
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
  raRequestBody: ReactiveAgentsRequestBody,
  fn: FunctionName,
  raTarget: ReactiveAgentsTarget,
): Record<string, unknown> => {
  // Get the configuration for the specified provider
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let functionConfig: AIProviderFunctionConfig | undefined;
  if (providerConfig.getConfig) {
    functionConfig = providerConfig.getConfig(raRequestBody)[
      fn
    ] as AIProviderFunctionConfig;
  } else {
    functionConfig = providerConfig[fn] as AIProviderFunctionConfig;
  }

  if (!functionConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  return transformUsingProviderConfig(functionConfig, raRequestBody, raTarget);
};

const transformToProviderRequestFormData = (
  provider: AIProvider,
  raRequestBody: ReactiveAgentsRequestBody,
  fn: FunctionName,
  raTarget: ReactiveAgentsTarget,
): FormData => {
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let functionConfig: AIProviderFunctionConfig | undefined;
  if (providerConfig?.getConfig) {
    const overrideConfig = providerConfig.getConfig(raRequestBody);
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
      if (configParam in raRequestBody) {
        const value = getValue(configParam, raRequestBody, paramConfig);

        formData.append(paramConfig.param, value as unknown as string);
      } else if (paramConfig?.required && paramConfig?.default !== undefined) {
        let value: unknown;
        if (typeof paramConfig.default === 'function') {
          value = paramConfig.default({ raRequestBody, raTarget });
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
  raTarget: ReactiveAgentsTarget,
  raRequestData: ReactiveAgentsRequestData,
): Record<string, unknown> | ReadableStream | FormData | ArrayBuffer => {
  // this returns a ReadableStream
  if (raRequestData.functionName === FunctionName.UPLOAD_FILE) {
    if (!(raRequestData.requestBody instanceof ReadableStream)) {
      throw new GatewayError(
        `Expected a ReadableStream for ${raRequestData.functionName} but got ${typeof raRequestData.requestBody}`,
      );
    }

    return transformToProviderRequestReadableStream(
      aiProvider,
      raRequestData.requestBody as ReadableStream,
      raRequestData.functionName,
    );
  }

  if (
    raRequestData.requestBody instanceof FormData ||
    raRequestData.requestBody instanceof ArrayBuffer
  )
    return raRequestData.requestBody;

  if (raRequestData.requestBody instanceof ReadableStream) {
    throw new GatewayError(
      `Unsupported request body type for ${raRequestData.functionName}: ${typeof raRequestData.requestBody}`,
    );
  }

  if (raRequestData.functionName === FunctionName.PROXY) {
    return raRequestData.requestBody;
  }

  const providerConfig = providerConfigs[aiProvider];

  if (!providerConfig) {
    throw new GatewayError(
      `${raRequestData.functionName} is not supported by ${aiProvider}`,
    );
  }

  const providerAPIConfig = providerConfig.api;

  if (providerAPIConfig.transformToFormData?.({ raRequestData })) {
    return transformToProviderRequestFormData(
      aiProvider,
      raRequestData.requestBody,
      raRequestData.functionName,
      raTarget,
    );
  }

  return transformToProviderRequestJSON(
    aiProvider,
    raRequestData.requestBody,
    raRequestData.functionName,
    raTarget,
  );
};

export default transformToProviderRequest;
