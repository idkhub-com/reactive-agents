import { providerConfigs } from '@server/ai-providers';
import { GatewayError } from '@server/errors/gateway';
import type { AIProviderFunctionConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type {
  IdkRequestBody,
  IdkRequestData,
} from '@shared/types/api/request/body';
import type { IdkTarget } from '@shared/types/api/request/headers';
import type {
  ChatCompletionParameterTransformFunction,
  ParameterConfig,
  ParameterValueTypes,
} from '@shared/types/api/response/body';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import { MCPServers } from '@shared/types/api/routes/shared/mcp-servers';
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
  idkRequestBody: IdkRequestBody,
  paramConfig: ParameterConfig,
): ParameterValueTypes => {
  let value = idkRequestBody[
    configParam as keyof typeof idkRequestBody
  ] as ParameterValueTypes;

  // If a transformation is defined for this parameter, apply it
  if (paramConfig.transform) {
    value = (paramConfig.transform as ChatCompletionParameterTransformFunction)(
      idkRequestBody as ChatCompletionRequestBody,
    );
  }

  if (
    value === 'idk-default' &&
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
  idkRequestBody: IdkRequestBody,
  idkTarget: IdkTarget,
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
      if (configParam in idkRequestBody) {
        // Get the value for this parameter
        const value = getValue(configParam, idkRequestBody, paramConfig);

        // Set the transformed parameter to the validated value
        setNestedProperty(
          transformedRequest,
          paramConfig?.param as string,
          value,
        );
      }
      // If the parameter is not present in the incoming request body but is required, set it to the default value
      else if (paramConfig?.required && paramConfig?.default !== undefined) {
        let value: unknown;
        if (typeof paramConfig.default === 'function') {
          value = paramConfig.default({ idkRequestBody, idkTarget });
        } else {
          value = paramConfig.default;
        }
        // Set the transformed parameter to the default value
        setNestedProperty(transformedRequest, paramConfig.param, value);
      }
    }
  }

  // Process MCP servers if present
  if ('mcp_servers' in idkRequestBody && idkRequestBody.mcp_servers) {
    try {
      const mcpServers = MCPServers.parse(idkRequestBody.mcp_servers);
      // Add MCP servers as a header for the provider
      transformedRequest['x-mcp-servers'] = JSON.stringify(mcpServers);
    } catch (error) {
      console.warn('Invalid MCP servers configuration:', error);
      // Continue without MCP servers - don't break the request
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
  idkRequestBody: IdkRequestBody,
  fn: FunctionName,
  idkTarget: IdkTarget,
): Record<string, unknown> => {
  // Get the configuration for the specified provider
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let functionConfig: AIProviderFunctionConfig | undefined;
  if (providerConfig.getConfig) {
    functionConfig = providerConfig.getConfig(idkRequestBody)[
      fn
    ] as AIProviderFunctionConfig;
  } else {
    functionConfig = providerConfig[fn] as AIProviderFunctionConfig;
  }

  if (!functionConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  return transformUsingProviderConfig(
    functionConfig,
    idkRequestBody,
    idkTarget,
  );
};

const transformToProviderRequestFormData = (
  provider: AIProvider,
  idkRequestBody: IdkRequestBody,
  fn: FunctionName,
  idkTarget: IdkTarget,
): FormData => {
  const providerConfig = providerConfigs[provider];

  if (!providerConfig) {
    throw new GatewayError(`${fn} is not supported by ${provider}`);
  }

  let functionConfig: AIProviderFunctionConfig | undefined;
  if (providerConfig?.getConfig) {
    const overrideConfig = providerConfig.getConfig(idkRequestBody);
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
      if (configParam in idkRequestBody) {
        const value = getValue(configParam, idkRequestBody, paramConfig);

        formData.append(paramConfig.param, value as unknown as string);
      } else if (paramConfig?.required && paramConfig?.default !== undefined) {
        let value: unknown;
        if (typeof paramConfig.default === 'function') {
          value = paramConfig.default({ idkRequestBody, idkTarget });
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
  idkTarget: IdkTarget,
  idkRequestData: IdkRequestData,
): Record<string, unknown> | ReadableStream | FormData | ArrayBuffer => {
  // this returns a ReadableStream
  if (idkRequestData.functionName === FunctionName.UPLOAD_FILE) {
    if (!(idkRequestData.requestBody instanceof ReadableStream)) {
      throw new GatewayError(
        `Expected a ReadableStream for ${idkRequestData.functionName} but got ${typeof idkRequestData.requestBody}`,
      );
    }

    return transformToProviderRequestReadableStream(
      aiProvider,
      idkRequestData.requestBody as ReadableStream,
      idkRequestData.functionName,
    );
  }

  if (
    idkRequestData.requestBody instanceof FormData ||
    idkRequestData.requestBody instanceof ArrayBuffer
  )
    return idkRequestData.requestBody;

  if (idkRequestData.requestBody instanceof ReadableStream) {
    throw new GatewayError(
      `Unsupported request body type for ${idkRequestData.functionName}: ${typeof idkRequestData.requestBody}`,
    );
  }

  if (idkRequestData.functionName === FunctionName.PROXY) {
    return idkRequestData.requestBody;
  }

  const providerConfig = providerConfigs[aiProvider];

  if (!providerConfig) {
    throw new GatewayError(
      `${idkRequestData.functionName} is not supported by ${aiProvider}`,
    );
  }

  const providerAPIConfig = providerConfig.api;

  if (providerAPIConfig.transformToFormData?.({ idkRequestData })) {
    return transformToProviderRequestFormData(
      aiProvider,
      idkRequestData.requestBody,
      idkRequestData.functionName,
      idkTarget,
    );
  }

  return transformToProviderRequestJSON(
    aiProvider,
    idkRequestData.requestBody,
    idkRequestData.functionName,
    idkTarget,
  );
};

export default transformToProviderRequest;
