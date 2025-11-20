import { providerConfigs } from '@server/ai-providers';
import { GatewayError } from '@server/errors/gateway';
import { HttpError } from '@server/errors/http';
import { RouterError } from '@server/errors/router';
import { responseHandler } from '@server/handlers/response-handler';
import { retryRequest } from '@server/handlers/retry-handler';
import { ConditionalRouter } from '@server/services/conditional-router';
import transformToProviderRequest from '@server/services/transform-to-provider-request';
import type { AppContext } from '@server/types/hono';
import { HttpMethod } from '@server/types/http';
import { getCachedResponse } from '@server/utils/cache';
import { inputHookHandler, outputHookHandler } from '@server/utils/hooks';
import {
  validateAndTransformParameter,
  validateParameter,
} from '@server/utils/model-validator';
import { constructRequest } from '@server/utils/reactive-agents/requests';
import {
  type CommonRequestOptions,
  type CreateResponseOptions,
  createResponse,
} from '@server/utils/reactive-agents/responses';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { ModelParameter } from '@shared/types/ai-providers/model-capabilities';
import { FunctionName } from '@shared/types/api/request';
import type {
  ReactiveAgentsRequestBody,
  ReactiveAgentsRequestData,
} from '@shared/types/api/request/body';
import type {
  ReactiveAgentsConfig,
  ReactiveAgentsTarget,
} from '@shared/types/api/request/headers';
import { HeaderKey, StrategyModes } from '@shared/types/api/request/headers';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import type { ResponsesRequestBody } from '@shared/types/api/routes/responses-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider, ContentTypeName } from '@shared/types/constants';
import { CacheStatus } from '@shared/types/middleware/cache';
import { HookType } from '@shared/types/middleware/hooks';
import { cloneDeep } from 'lodash';

function getProxyPath(
  requestURL: string,
  proxyProvider: AIProvider,
  proxyEndpointPath: string,
  baseURL: string,
  raTarget: ReactiveAgentsTarget,
): string {
  const reqURL = new URL(requestURL);
  let reqPath = reqURL.pathname;
  const reqQuery = reqURL.search;
  reqPath = reqPath.replace(proxyEndpointPath, '');

  // NOTE: temporary support for the deprecated way of making azure requests
  // where the endpoint was sent in request path of the incoming gateway url
  if (
    proxyProvider === AIProvider.AZURE_OPENAI &&
    reqPath.includes('.openai.azure.com')
  ) {
    return `https:/${reqPath}${reqQuery}`;
  }

  const providerConfig = providerConfigs[proxyProvider];

  if (providerConfig?.api?.getProxyEndpoint) {
    return `${baseURL}${providerConfig.api.getProxyEndpoint({ reqPath, reqQuery, raTarget: raTarget })}`;
  }

  let proxyPath = `${baseURL}${reqPath}${reqQuery}`;

  // Fix specific for Anthropic SDK calls. Is this needed? - Yes
  if (proxyProvider === AIProvider.ANTHROPIC) {
    proxyPath = proxyPath.replace('/v1/v1/', '/v1/');
  }

  return proxyPath;
}

function getHyperParamDefaults(
  functionName: FunctionName,
  raTarget: ReactiveAgentsTarget,
) {
  // Apply configuration params as defaults (before override params)
  const configDefaults: Record<string, unknown> = {
    model: raTarget.configuration.model,
  };

  const provider = raTarget.configuration.ai_provider;
  const modelId = raTarget.configuration.model;

  // Helper function to validate, transform, and add parameter
  const addParameter = (
    parameter: ModelParameter,
    value: unknown,
    paramKey?: string,
  ) => {
    if (value === null) return;

    // Only transform numeric parameters (temperature, top_p, etc.)
    const isNumericParameter = typeof value === 'number';

    const validation = isNumericParameter
      ? validateAndTransformParameter(
          provider,
          modelId,
          parameter,
          value,
          functionName,
          true, // shouldTransform = true
        )
      : validateParameter(provider, modelId, parameter, functionName);

    if (validation.isSupported && validation.parameterName) {
      const key = paramKey || validation.parameterName;
      // Use transformed value if available, otherwise use original
      const finalValue = validation.transformedValue ?? value;
      configDefaults[key] = finalValue;
    }
  };

  // Validate and add each parameter
  addParameter(
    ModelParameter.TEMPERATURE,
    raTarget.configuration.temperature,
    'temperature',
  );

  addParameter(
    ModelParameter.MAX_TOKENS,
    raTarget.configuration.max_tokens,
    'max_tokens',
  );

  addParameter(ModelParameter.TOP_P, raTarget.configuration.top_p, 'top_p');

  addParameter(
    ModelParameter.FREQUENCY_PENALTY,
    raTarget.configuration.frequency_penalty,
    'frequency_penalty',
  );

  addParameter(
    ModelParameter.PRESENCE_PENALTY,
    raTarget.configuration.presence_penalty,
    'presence_penalty',
  );

  addParameter(ModelParameter.STOP, raTarget.configuration.stop, 'stop');

  addParameter(ModelParameter.SEED, raTarget.configuration.seed, 'seed');

  // Handle reasoning_effort (different structure for different function names)
  if (raTarget.configuration.reasoning_effort !== null) {
    const validation = validateParameter(
      provider,
      modelId,
      ModelParameter.REASONING_EFFORT,
      functionName,
    );

    if (validation.isSupported) {
      switch (functionName) {
        case FunctionName.STREAM_CHAT_COMPLETE:
        case FunctionName.CHAT_COMPLETE:
          configDefaults.reasoning_effort =
            raTarget.configuration.reasoning_effort;
          break;
        case FunctionName.CREATE_MODEL_RESPONSE:
          configDefaults.reasoning = {
            effort: raTarget.configuration.reasoning_effort,
          };
          break;
        default:
          throw new Error(`Unsupported function name: ${functionName}`);
      }

      if (validation.warning) {
        console.warn(
          `[${provider}/${modelId}][${functionName}] reasoning_effort: ${validation.warning}`,
        );
      }
    } else if (validation.reason) {
      console.warn(
        `[${provider}/${modelId}][${functionName}] ✗ Skipped reasoning_effort (value: ${JSON.stringify(raTarget.configuration.reasoning_effort)}): ${validation.reason}`,
      );
    }
  }

  return configDefaults;
}

/**
 * Makes a POST request to a provider and returns the response.
 * The POST request is constructed using the provider, apiKey, and requestBody parameters.
 * The fn parameter is the type of request being made (e.g., "complete", "chatComplete").
 */
export async function tryPost(
  c: AppContext,
  raConfig: ReactiveAgentsConfig,
  raTarget: ReactiveAgentsTarget,
  raRequestData: ReactiveAgentsRequestData,
  currentIndex: number,
): Promise<Response> {
  try {
    const hyperParamDefaults = getHyperParamDefaults(
      raRequestData.functionName,
      raTarget,
    );

    const overrideParams = raConfig?.override_params || {};
    // Merge: base request body -> config defaults -> override params
    const overriddenReactiveAgentsRequestBody: ReactiveAgentsRequestBody = {
      ...(raRequestData.requestBody as Record<string, unknown>),
      ...hyperParamDefaults,
      ...overrideParams,
    } as ReactiveAgentsRequestBody;

    // Helper to generate JSON schema instructions for response_format
    const getJsonSchemaInstructions = (
      responseFormat: ChatCompletionRequestBody['response_format'],
    ): string => {
      if (!responseFormat) return '';

      if (responseFormat.type === 'json_schema') {
        const schema =
          responseFormat.json_schema?.schema ?? responseFormat.json_schema;
        if (schema && typeof schema === 'object') {
          return `\n\nIMPORTANT: You must output your response as a JSON object that strictly conforms to the following schema:\n\n${JSON.stringify(schema, null, 2)}\n\nEnsure every required field is present with the correct type and format. Use the __json_output tool to provide your response.`;
        }
      } else if (responseFormat.type === 'json_object') {
        return '\n\nIMPORTANT: You must output your response as a valid JSON object. Use the __json_output tool to provide your response.';
      }

      return '';
    };

    if (
      raTarget.configuration.system_prompt &&
      (raRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE ||
        raRequestData.functionName === FunctionName.CHAT_COMPLETE ||
        raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE)
    ) {
      // Handle system prompt with template variables
      let systemPrompt = raTarget.configuration.system_prompt;

      // Augment system prompt with JSON schema instructions if response_format is present
      const responseFormat = (
        overriddenReactiveAgentsRequestBody as ChatCompletionRequestBody
      ).response_format;
      systemPrompt += getJsonSchemaInstructions(responseFormat);

      // Add system prompt if not overridden by the user
      switch (raRequestData.functionName) {
        case FunctionName.CHAT_COMPLETE:
        case FunctionName.STREAM_CHAT_COMPLETE: {
          const messages = (
            overriddenReactiveAgentsRequestBody as ChatCompletionRequestBody
          ).messages;

          // Find existing system message or add new one at the beginning
          const systemMessageIndex = messages.findIndex(
            (msg) => msg.role === ChatCompletionMessageRole.SYSTEM,
          );
          const systemMessage = {
            role: ChatCompletionMessageRole.SYSTEM,
            content: systemPrompt,
          };

          if (systemMessageIndex >= 0) {
            // Replace existing system message
            messages[systemMessageIndex] = systemMessage;
          } else {
            // Add system message at the beginning
            messages.unshift(systemMessage);
          }

          (
            overriddenReactiveAgentsRequestBody as ChatCompletionRequestBody
          ).messages = messages;
          break;
        }
        case FunctionName.CREATE_MODEL_RESPONSE: {
          const inputPreview = (
            overriddenReactiveAgentsRequestBody as ResponsesRequestBody
          ).input;

          let input: Record<string, unknown>[] = [];
          // If inputPreview is not an array, convert it to an array so that we can add the system prompt
          if (!Array.isArray(inputPreview)) {
            input = [
              {
                role: ChatCompletionMessageRole.USER,
                content: inputPreview,
              },
            ];
          } else {
            input = inputPreview;
          }

          // Find existing system message or add new one at the beginning
          const systemMessageIndex = input.findIndex(
            (msg) => msg.role === ChatCompletionMessageRole.SYSTEM,
          );
          const systemMessage = {
            role: ChatCompletionMessageRole.SYSTEM,
            content: systemPrompt,
          };

          if (systemMessageIndex >= 0) {
            // Replace existing system message
            input[systemMessageIndex] = systemMessage;
          } else {
            // Add system message at the beginning
            input.unshift(systemMessage);
          }

          (
            overriddenReactiveAgentsRequestBody as Record<string, unknown>
          ).input = input;
        }
      }
    } else if (
      !raTarget.configuration.system_prompt &&
      (raRequestData.functionName === FunctionName.CHAT_COMPLETE ||
        raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE)
    ) {
      // If there's no system prompt from the optimization arm,
      // we still need to augment any existing system message in the user's request
      // with JSON schema instructions if response_format is present
      const responseFormat = (
        overriddenReactiveAgentsRequestBody as ChatCompletionRequestBody
      ).response_format;
      const jsonInstructions = getJsonSchemaInstructions(responseFormat);

      if (jsonInstructions) {
        const messages = (
          overriddenReactiveAgentsRequestBody as ChatCompletionRequestBody
        ).messages;

        // Find existing system message
        const systemMessageIndex = messages.findIndex(
          (msg) => msg.role === ChatCompletionMessageRole.SYSTEM,
        );

        if (systemMessageIndex >= 0) {
          // Augment existing system message
          const existingContent = messages[systemMessageIndex].content || '';
          messages[systemMessageIndex].content =
            existingContent + jsonInstructions;
        } else {
          // Create new system message with just the JSON instructions
          messages.unshift({
            role: ChatCompletionMessageRole.SYSTEM,
            content: jsonInstructions.trim(),
          });
        }

        (
          overriddenReactiveAgentsRequestBody as ChatCompletionRequestBody
        ).messages = messages;
      }
    }

    let isStreamingMode = false;
    if ('stream' in overriddenReactiveAgentsRequestBody) {
      isStreamingMode = overriddenReactiveAgentsRequestBody.stream
        ? (overriddenReactiveAgentsRequestBody.stream as boolean)
        : false;
    }

    const overriddenReactiveAgentsRequestData = cloneDeep(raRequestData);
    overriddenReactiveAgentsRequestData.requestBody =
      overriddenReactiveAgentsRequestBody;

    let strictOpenAiCompliance = true;

    if (raConfig.strict_open_ai_compliance === false) {
      strictOpenAiCompliance = false;
    }

    // Mapping providers to corresponding URLs
    const internalProviderConfig =
      providerConfigs[raTarget.configuration.ai_provider];

    if (!internalProviderConfig) {
      throw new Error(
        `Provider config not found for provider: ${raTarget.configuration.ai_provider}`,
      );
    }

    const apiConfig: InternalProviderAPIConfig = internalProviderConfig.api;

    const customHost = raTarget.custom_host || '';

    const baseUrl =
      customHost ||
      (await apiConfig.getBaseURL({
        c,
        raTarget,
        raRequestData: overriddenReactiveAgentsRequestData,
      }));
    const endpoint = apiConfig.getEndpoint({
      c,
      raTarget,
      raRequestData: overriddenReactiveAgentsRequestData,
    });

    const url =
      overriddenReactiveAgentsRequestData.functionName === FunctionName.PROXY
        ? getProxyPath(
            overriddenReactiveAgentsRequestData.url,
            raTarget.configuration.ai_provider,
            overriddenReactiveAgentsRequestData.url.indexOf('/v1/proxy') > -1
              ? '/v1/proxy'
              : '/v1',
            baseUrl,
            raTarget,
          )
        : `${baseUrl}${endpoint}`;

    let fetchConfig: RequestInit = {};

    const outputSyncHooks = raConfig.hooks?.filter(
      (hook) => hook.type === HookType.OUTPUT_HOOK && hook.await === true,
    );

    c.set('ra_request_data', overriddenReactiveAgentsRequestData);

    const commonRequestOptions: CommonRequestOptions = {
      raRequestData: overriddenReactiveAgentsRequestData,
      aiProviderRequestURL: url,
      isStreamingMode,
      provider: raTarget.configuration.ai_provider,
      strictOpenAiCompliance,
      areSyncHooksAvailable: outputSyncHooks?.length > 0,
      currentIndex,
      fetchOptions: fetchConfig,
      cacheSettings: raTarget.cache,
    };

    const {
      errorResponse: inputHooksErrorResponse,
      transformedReactiveAgentsBody,
    } = await inputHookHandler(c, overriddenReactiveAgentsRequestData);

    if (inputHooksErrorResponse) {
      const createResponseOptions: CreateResponseOptions = {
        response: inputHooksErrorResponse,
        responseTransformerFunctionName: undefined,
        cacheStatus: CacheStatus.MISS,
        retryCount: undefined,
        aiProviderRequestBody: {},
        ...commonRequestOptions,
      };

      return createResponse(c, createResponseOptions);
    }

    if (transformedReactiveAgentsBody) {
      overriddenReactiveAgentsRequestData.requestBody =
        transformedReactiveAgentsBody;
    }

    let aiProviderRequestBody:
      | Record<string, unknown>
      | ReadableStream
      | ArrayBuffer
      | FormData = overriddenReactiveAgentsRequestBody as
      | Record<string, unknown>
      | ReadableStream
      | ArrayBuffer
      | FormData;

    // Attach the body of the request
    if (
      !internalProviderConfig?.requestHandlers?.[
        overriddenReactiveAgentsRequestData.functionName
      ]
    ) {
      aiProviderRequestBody =
        overriddenReactiveAgentsRequestData.method === HttpMethod.POST
          ? transformToProviderRequest(
              raTarget.configuration.ai_provider,
              raTarget,
              overriddenReactiveAgentsRequestData,
            )
          : overriddenReactiveAgentsRequestBody;

      // Debug logging for Anthropic JSON mode
      if (
        raTarget.configuration.ai_provider === 'anthropic' &&
        overriddenReactiveAgentsRequestData.requestBody &&
        'response_format' in overriddenReactiveAgentsRequestData.requestBody
      ) {
        console.log(
          '[DEBUG] Anthropic request body being sent:',
          JSON.stringify(aiProviderRequestBody, null, 2),
        );
      }
    }

    const apiConfigHeaders = await apiConfig.headers({
      c,
      raTarget,
      raRequestData: overriddenReactiveAgentsRequestData,
    });

    // Construct the base object for the POST request
    fetchConfig = constructRequest(
      overriddenReactiveAgentsRequestData,
      apiConfigHeaders as Record<string, string>,
      {},
      {},
    );

    let apiConfigContentTypeHeader = apiConfigHeaders[HeaderKey.CONTENT_TYPE] as
      | string
      | undefined;

    if (!apiConfigContentTypeHeader) {
      apiConfigContentTypeHeader =
        overriddenReactiveAgentsRequestData.requestHeaders[
          HeaderKey.CONTENT_TYPE
        ]?.split(';')[0];
      if (!apiConfigContentTypeHeader) {
        console.warn(
          'No Content-Type header found in request. Using application/json as default.',
        );

        apiConfigContentTypeHeader = 'application/json';
      }
    }

    const requestContentType =
      overriddenReactiveAgentsRequestData.requestHeaders[
        HeaderKey.CONTENT_TYPE
      ]?.split(';')[0];

    if (
      apiConfigContentTypeHeader === ContentTypeName.MULTIPART_FORM_DATA ||
      (overriddenReactiveAgentsRequestData.functionName === 'proxy' &&
        requestContentType === ContentTypeName.MULTIPART_FORM_DATA)
    ) {
      fetchConfig.body = aiProviderRequestBody as FormData;
    } else if (aiProviderRequestBody instanceof ReadableStream) {
      fetchConfig.body = aiProviderRequestBody;
    } else if (
      overriddenReactiveAgentsRequestData.functionName === 'proxy' &&
      requestContentType?.startsWith(ContentTypeName.GENERIC_AUDIO_PATTERN)
    ) {
      fetchConfig.body = aiProviderRequestBody as ArrayBuffer;
    } else if (requestContentType) {
      fetchConfig.body = JSON.stringify(aiProviderRequestBody);
    }

    if (
      ['GET', 'DELETE'].includes(overriddenReactiveAgentsRequestData.method)
    ) {
      delete fetchConfig.body;
    }

    // Return cached response if it exists
    const cachedResponse = await getCachedResponse(
      c,
      commonRequestOptions,
      aiProviderRequestBody,
    );

    if (cachedResponse) {
      return cachedResponse;
    }

    // Request handler (Including retries, recursion and hooks)
    const handlerResult = await recursiveOutputHookHandler(
      c,
      commonRequestOptions,
      url,
      fetchConfig,
      raTarget,
      isStreamingMode,
      overriddenReactiveAgentsRequestData,
      0,
      strictOpenAiCompliance,
    );

    const createResponseOptions: CreateResponseOptions = {
      response: handlerResult.mappedResponse,
      responseTransformerFunctionName: undefined,
      cacheStatus: CacheStatus.MISS,
      retryCount: undefined,
      aiProviderRequestBody,
      ...commonRequestOptions,
    };

    return createResponse(c, createResponseOptions);
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(error.response.body, {
        status: error.response.status,
        statusText: error.response.statusText,
      });
    }
    return new Response(
      JSON.stringify({
        error: `${error}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

export async function tryTarget(
  c: AppContext,
  raConfig: ReactiveAgentsConfig,
  raTarget: ReactiveAgentsTarget,
  raRequestData: ReactiveAgentsRequestData,
): Promise<Response> {
  return await tryPost(c, raConfig, raTarget, raRequestData, 0);
}

export async function tryTargets(
  c: AppContext,
  raConfig: ReactiveAgentsConfig,
  raRequestData: ReactiveAgentsRequestData,
): Promise<Response> {
  const strategyMode = raConfig.strategy.mode;

  let response: Response | undefined;

  switch (strategyMode) {
    case StrategyModes.FALLBACK:
      for (const target of raConfig.targets) {
        response = await tryTarget(c, raConfig, target, raRequestData);
        if (
          response?.ok &&
          !raConfig.strategy.on_status_codes?.includes(response?.status)
        ) {
          break;
        }
      }
      break;

    case StrategyModes.LOADBALANCE: {
      raConfig.targets.forEach((t: ReactiveAgentsTarget) => {
        if (t.weight === undefined) {
          t.weight = 1;
        }
      });
      const totalWeight = raConfig.targets.reduce(
        (sum: number, raTarget: ReactiveAgentsTarget) => sum + raTarget.weight!,
        0,
      );

      let randomWeight = Math.random() * totalWeight;
      for (const raTarget of raConfig.targets) {
        if (randomWeight < raTarget.weight) {
          response = await tryTarget(c, raConfig, raTarget, raRequestData);
          break;
        }
        randomWeight -= raTarget.weight;
      }
      break;
    }

    case StrategyModes.CONDITIONAL: {
      const metadata = raConfig.metadata;

      const params =
        raRequestData.requestBody instanceof FormData ||
        raRequestData.requestBody instanceof ReadableStream ||
        raRequestData.requestBody instanceof ArrayBuffer
          ? {} // Send empty object if not JSON
          : raRequestData.requestBody;

      let conditionalRouter: ConditionalRouter;
      let finalTarget: ReactiveAgentsTarget;
      try {
        conditionalRouter = new ConditionalRouter(raConfig, {
          metadata,
          params,
        });
        finalTarget = conditionalRouter.resolveTarget();
      } catch (e: unknown) {
        if (e instanceof Error) {
          throw new RouterError(e.message);
        }
        throw new RouterError('Unknown error');
      }

      response = await tryTarget(c, raConfig, finalTarget, raRequestData);
      break;
    }

    case StrategyModes.SINGLE:
      response = await tryTarget(
        c,
        raConfig,
        raConfig.targets[0],
        raRequestData,
      );
      break;

    default:
      try {
        response = await tryPost(
          c,
          raConfig,
          raConfig.targets[0],
          raRequestData,
          0,
        );
      } catch (e) {
        // tryPost always returns a Response.
        // TypeError will check for all unhandled exceptions.
        // GatewayError will check for all handled exceptions which cannot allow the request to proceed.
        if (e instanceof TypeError || e instanceof GatewayError) {
          const errorMessage =
            e instanceof GatewayError ? e.message : 'Something went wrong';
          response = new Response(
            JSON.stringify({
              status: 'failure',
              message: errorMessage,
            }),
            {
              status: 500,
              headers: {
                'content-type': 'application/json',
                // Add this header so that the fallback loop can be interrupted if its an exception.
                'ra-gateway-exception': 'true',
              },
            },
          );
        } else {
          if (e instanceof HttpError) {
            response = new Response(e.response.body, {
              status: e.response.status,
              statusText: e.response.statusText,
            });
          }
        }
      }
      break;
  }

  if (!response) {
    throw new GatewayError('No response from target');
  }

  return response;
}

export async function recursiveOutputHookHandler(
  c: AppContext,
  commonRequestOptions: CommonRequestOptions,
  aiProviderRequestURL: string,
  options: RequestInit,
  raTarget: ReactiveAgentsTarget,
  isStreamingMode: boolean,
  raRequestData: ReactiveAgentsRequestData,
  retryAttemptsMade: number,
  strictOpenAiCompliance: boolean,
): Promise<{
  mappedResponse: Response;
  retryCount: number;
  createdAt: Date;
  originalResponseJson?: Record<string, unknown> | null;
}> {
  let response: Response,
    retryCount: number | undefined,
    createdAt: Date,
    retrySkipped: boolean;
  const requestTimeout = raTarget.request_timeout || null;

  const { retry } = raTarget;

  const providerConfig = providerConfigs[raTarget.configuration.ai_provider];
  if (!providerConfig) {
    throw new Error(`Provider ${raTarget.configuration.ai_provider} not found`);
  }
  const requestHandlers = providerConfig.requestHandlers;
  let requestHandler: (() => Promise<Response>) | undefined;

  const fn = raRequestData.functionName;

  if (requestHandlers?.[fn]) {
    const requestHandlerFunction = requestHandlers[fn];

    requestHandler = async (): Promise<Response> =>
      requestHandlerFunction({
        c,
        raTarget,
        raRequestData,
      });
  }

  ({
    response,
    attempt: retryCount,
    createdAt,
    skip: retrySkipped,
  } = await retryRequest(
    aiProviderRequestURL,
    options,
    retry?.attempts || 0,
    retry?.on_status_codes || [],
    requestTimeout || null,
    requestHandler,
    retry?.use_retry_after_header || false,
  ));

  // Create callback to capture first token time for streaming responses
  const onFirstChunk = isStreamingMode
    ? () => {
        c.set('first_token_time', Date.now());
      }
    : undefined;

  const {
    response: mappedResponse,
    raResponseBody,
    originalResponseJson,
  } = await responseHandler(
    response,
    isStreamingMode,
    raTarget.configuration.ai_provider,
    raRequestData.functionName,
    aiProviderRequestURL,
    CacheStatus.MISS,
    raRequestData,
    strictOpenAiCompliance,
    commonRequestOptions.areSyncHooksAvailable,
    onFirstChunk,
  );

  if (!mappedResponse.ok) {
    const errorBody = await mappedResponse.text();
    throw new HttpError(errorBody, {
      status: mappedResponse.status,
      statusText: mappedResponse.statusText,
      body: errorBody,
    });
  }

  if (!raResponseBody) {
    throw new GatewayError('No response body from target');
  }

  const outputHookResponse = await outputHookHandler(
    c,
    raRequestData,
    mappedResponse,
    raResponseBody,
    retryAttemptsMade,
  );

  const remainingRetryCount =
    (retry?.attempts || 0) - (retryCount || 0) - retryAttemptsMade;

  const isRetriableStatusCode = retry?.on_status_codes?.includes(
    outputHookResponse.status,
  );

  if (remainingRetryCount > 0 && !retrySkipped && isRetriableStatusCode) {
    return recursiveOutputHookHandler(
      c,
      commonRequestOptions,
      aiProviderRequestURL,
      options,
      raTarget,
      isStreamingMode,
      raRequestData,
      (retryCount || 0) + 1 + retryAttemptsMade,
      strictOpenAiCompliance,
    );
  }

  let lastAttempt = (retryCount || 0) + retryAttemptsMade;
  if (
    (lastAttempt === (retry?.attempts || 0) && isRetriableStatusCode) ||
    retrySkipped
  ) {
    lastAttempt = -1; // All retry attempts exhausted without success.
  }

  return {
    mappedResponse: outputHookResponse,
    retryCount: lastAttempt,
    createdAt,
    originalResponseJson,
  };
}
