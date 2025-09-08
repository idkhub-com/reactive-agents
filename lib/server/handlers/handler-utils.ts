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
import { constructRequest } from '@server/utils/idkhub/request';
import {
  type CommonRequestOptions,
  type CreateResponseOptions,
  createResponse,
} from '@server/utils/idkhub/response';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type {
  IdkRequestBody,
  IdkRequestData,
} from '@shared/types/api/request/body';
import type { IdkConfig, IdkTarget } from '@shared/types/api/request/headers';
import { HeaderKey, StrategyModes } from '@shared/types/api/request/headers';
import { AIProvider, ContentTypeName } from '@shared/types/constants';
import { CacheStatus } from '@shared/types/middleware/cache';
import { HookType } from '@shared/types/middleware/hooks';
import { cloneDeep } from 'lodash';

function getProxyPath(
  requestURL: string,
  proxyProvider: AIProvider,
  proxyEndpointPath: string,
  baseURL: string,
  idkTarget: IdkTarget,
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
    return `${baseURL}${providerConfig.api.getProxyEndpoint({ reqPath, reqQuery, idkTarget: idkTarget })}`;
  }

  let proxyPath = `${baseURL}${reqPath}${reqQuery}`;

  // Fix specific for Anthropic SDK calls. Is this needed? - Yes
  if (proxyProvider === AIProvider.ANTHROPIC) {
    proxyPath = proxyPath.replace('/v1/v1/', '/v1/');
  }

  return proxyPath;
}

/**
 * Makes a POST request to a provider and returns the response.
 * The POST request is constructed using the provider, apiKey, and requestBody parameters.
 * The fn parameter is the type of request being made (e.g., "complete", "chatComplete").
 */
export async function tryPost(
  c: AppContext,
  idkConfig: IdkConfig,
  idkTarget: IdkTarget,
  idkRequestData: IdkRequestData,
  currentIndex: number,
): Promise<Response> {
  const overrideParams = idkConfig?.override_params || {};

  const overriddenIdkRequestBody: IdkRequestBody = {
    ...(idkRequestData.requestBody as Record<string, unknown>),
    ...overrideParams,
  };

  let isStreamingMode = false;
  if ('stream' in overriddenIdkRequestBody) {
    isStreamingMode = overriddenIdkRequestBody.stream
      ? (overriddenIdkRequestBody.stream as boolean)
      : false;
  }

  const overriddenIdkRequestData = cloneDeep(idkRequestData);
  overriddenIdkRequestData.requestBody = overriddenIdkRequestBody;

  let strictOpenAiCompliance = true;

  if (idkConfig.strict_open_ai_compliance === false) {
    strictOpenAiCompliance = false;
  }

  // Mapping providers to corresponding URLs
  const internalProviderConfig = providerConfigs[idkTarget.provider];

  if (!internalProviderConfig) {
    throw new Error(
      `Provider config not found for provider: ${idkTarget.provider}`,
    );
  }

  const apiConfig: InternalProviderAPIConfig = internalProviderConfig.api;

  const customHost = idkTarget.custom_host || '';

  const baseUrl =
    customHost ||
    (await apiConfig.getBaseURL({
      c,
      idkTarget,
      idkRequestData: overriddenIdkRequestData,
    }));
  const endpoint = apiConfig.getEndpoint({
    c,
    idkTarget,
    idkRequestData: overriddenIdkRequestData,
  });

  const url =
    overriddenIdkRequestData.functionName === FunctionName.PROXY
      ? getProxyPath(
          overriddenIdkRequestData.url,
          idkTarget.provider,
          overriddenIdkRequestData.url.indexOf('/v1/proxy') > -1
            ? '/v1/proxy'
            : '/v1',
          baseUrl,
          idkTarget,
        )
      : `${baseUrl}${endpoint}`;

  let fetchConfig: RequestInit = {};

  const outputSyncHooks = idkConfig.hooks?.filter(
    (hook) => hook.type === HookType.OUTPUT_HOOK && hook.await === true,
  );

  const commonRequestOptions: CommonRequestOptions = {
    idkRequestData: overriddenIdkRequestData,
    aiProviderRequestURL: url,
    isStreamingMode,
    provider: idkTarget.provider,
    strictOpenAiCompliance,
    areSyncHooksAvailable: outputSyncHooks?.length > 0,
    currentIndex,
    fetchOptions: fetchConfig,
    cacheSettings: idkTarget.cache,
  };

  const { errorResponse: inputHooksErrorResponse, transformedIdkBody } =
    await inputHookHandler(c, overriddenIdkRequestData);

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

  if (transformedIdkBody) {
    overriddenIdkRequestData.requestBody = transformedIdkBody;
  }

  let aiProviderRequestBody:
    | Record<string, unknown>
    | ReadableStream
    | ArrayBuffer
    | FormData = overriddenIdkRequestBody as
    | Record<string, unknown>
    | ReadableStream
    | ArrayBuffer
    | FormData;

  // Attach the body of the request
  if (
    !internalProviderConfig?.requestHandlers?.[
      overriddenIdkRequestData.functionName
    ]
  ) {
    aiProviderRequestBody =
      overriddenIdkRequestData.method === HttpMethod.POST
        ? transformToProviderRequest(
            idkTarget.provider,
            idkTarget,
            overriddenIdkRequestData,
          )
        : overriddenIdkRequestBody;
  }

  const apiConfigHeaders = await apiConfig.headers({
    c,
    idkTarget,
    idkRequestData: overriddenIdkRequestData,
  });

  // Construct the base object for the POST request
  fetchConfig = constructRequest(
    overriddenIdkRequestData,
    apiConfigHeaders as Record<string, string>,
    {},
    {},
  );

  let apiConfigContentTypeHeader = apiConfigHeaders[HeaderKey.CONTENT_TYPE] as
    | string
    | undefined;

  if (!apiConfigContentTypeHeader) {
    apiConfigContentTypeHeader =
      overriddenIdkRequestData.requestHeaders[HeaderKey.CONTENT_TYPE]?.split(
        ';',
      )[0];
    if (!apiConfigContentTypeHeader) {
      console.warn(
        'No Content-Type header found in request. Using application/json as default.',
      );

      apiConfigContentTypeHeader = 'application/json';
    }
  }

  const requestContentType =
    overriddenIdkRequestData.requestHeaders[HeaderKey.CONTENT_TYPE]?.split(
      ';',
    )[0];

  if (
    apiConfigContentTypeHeader === ContentTypeName.MULTIPART_FORM_DATA ||
    (overriddenIdkRequestData.functionName === 'proxy' &&
      requestContentType === ContentTypeName.MULTIPART_FORM_DATA)
  ) {
    fetchConfig.body = aiProviderRequestBody as FormData;
  } else if (aiProviderRequestBody instanceof ReadableStream) {
    fetchConfig.body = aiProviderRequestBody;
  } else if (
    overriddenIdkRequestData.functionName === 'proxy' &&
    requestContentType?.startsWith(ContentTypeName.GENERIC_AUDIO_PATTERN)
  ) {
    fetchConfig.body = aiProviderRequestBody as ArrayBuffer;
  } else if (requestContentType) {
    fetchConfig.body = JSON.stringify(aiProviderRequestBody);
  }

  if (['GET', 'DELETE'].includes(overriddenIdkRequestData.method)) {
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
    idkTarget,
    isStreamingMode,
    overriddenIdkRequestData,
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
}

export async function tryTarget(
  c: AppContext,
  idkConfig: IdkConfig,
  idkTarget: IdkTarget,
  idkRequestData: IdkRequestData,
): Promise<Response> {
  return await tryPost(c, idkConfig, idkTarget, idkRequestData, 0);
}

export async function tryTargets(
  c: AppContext,
  idkConfig: IdkConfig,
  idkRequestData: IdkRequestData,
): Promise<Response> {
  const strategyMode = idkConfig.strategy.mode;

  let response: Response | undefined;

  switch (strategyMode) {
    case StrategyModes.FALLBACK:
      for (const target of idkConfig.targets) {
        response = await tryTarget(c, idkConfig, target, idkRequestData);
        if (
          response?.ok &&
          !idkConfig.strategy.on_status_codes?.includes(response?.status)
        ) {
          break;
        }
      }
      break;

    case StrategyModes.LOADBALANCE: {
      idkConfig.targets.forEach((t: IdkTarget) => {
        if (t.weight === undefined) {
          t.weight = 1;
        }
      });
      const totalWeight = idkConfig.targets.reduce(
        (sum: number, idkhubTarget: IdkTarget) => sum + idkhubTarget.weight!,
        0,
      );

      let randomWeight = Math.random() * totalWeight;
      for (const idkhubTarget of idkConfig.targets) {
        if (randomWeight < idkhubTarget.weight) {
          response = await tryTarget(
            c,
            idkConfig,
            idkhubTarget,
            idkRequestData,
          );
          break;
        }
        randomWeight -= idkhubTarget.weight;
      }
      break;
    }

    case StrategyModes.CONDITIONAL: {
      const metadata = idkConfig.metadata;

      const params =
        idkRequestData.requestBody instanceof FormData ||
        idkRequestData.requestBody instanceof ReadableStream ||
        idkRequestData.requestBody instanceof ArrayBuffer
          ? {} // Send empty object if not JSON
          : idkRequestData.requestBody;

      let conditionalRouter: ConditionalRouter;
      let finalTarget: IdkTarget;
      try {
        conditionalRouter = new ConditionalRouter(idkConfig, {
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

      response = await tryTarget(c, idkConfig, finalTarget, idkRequestData);
      break;
    }

    case StrategyModes.SINGLE:
      response = await tryTarget(
        c,
        idkConfig,
        idkConfig.targets[0],
        idkRequestData,
      );
      break;

    default:
      try {
        response = await tryPost(
          c,
          idkConfig,
          idkConfig.targets[0],
          idkRequestData,
          0,
        );
      } catch (e) {
        // tryPost always returns a Response.
        // TypeError will check for all unhandled exceptions.
        // GatewayError will check for all handled exceptions which cannot allow the request to proceed.
        if (e instanceof TypeError || e instanceof GatewayError) {
          const { createInternalErrorResponse } = await import(
            '@server/utils/error-classification-central'
          );
          const errorObj = e instanceof Error ? e : new Error(String(e));
          const internalErrorResponse = createInternalErrorResponse(errorObj, {
            provider: idkConfig.targets[0]?.provider || 'system',
            functionName: idkRequestData.functionName,
            stage: 'request',
          });

          response = new Response(JSON.stringify(internalErrorResponse), {
            status: internalErrorResponse.status || 500,
            headers: {
              'content-type': 'application/json',
              // Add this header so that the fallback loop can be interrupted if its an exception.
              'x-idk-gateway-exception': 'true',
            },
          });
        } else {
          if (e instanceof HttpError) {
            response = new Response(e.response.body, {
              status: e.response.status,
              statusText: e.response.statusText,
            });
          } else {
            // Handle any other thrown errors with centralized system
            const { createInternalErrorResponse } = await import(
              '@server/utils/error-classification-central'
            );
            const errorObj = e instanceof Error ? e : new Error(String(e));
            const internalErrorResponse = createInternalErrorResponse(
              errorObj,
              {
                provider: idkConfig.targets[0]?.provider || 'system',
                functionName: idkRequestData.functionName,
                stage: 'request',
              },
            );

            response = new Response(JSON.stringify(internalErrorResponse), {
              status: internalErrorResponse.status || 500,
              headers: { 'content-type': 'application/json' },
            });
          }
          console.error(e);
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
  idkTarget: IdkTarget,
  isStreamingMode: boolean,
  idkRequestData: IdkRequestData,
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
  const requestTimeout = idkTarget.request_timeout || null;

  const { retry } = idkTarget;

  const provider = idkTarget.provider || AIProvider.OPENAI;
  const providerConfig = providerConfigs[provider];
  if (!providerConfig) {
    throw new Error(`Provider ${provider} not found`);
  }
  const requestHandlers = providerConfig.requestHandlers;
  let requestHandler: (() => Promise<Response>) | undefined;

  const fn = idkRequestData.functionName;

  if (requestHandlers?.[fn]) {
    const requestHandlerFunction = requestHandlers[fn];

    requestHandler = async (): Promise<Response> =>
      requestHandlerFunction({
        c,
        idkTarget,
        idkRequestData,
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

  const {
    response: mappedResponse,
    idkResponseBody,
    originalResponseJson,
  } = await responseHandler(
    response,
    isStreamingMode,
    provider,
    idkRequestData.functionName,
    aiProviderRequestURL,
    CacheStatus.MISS,
    idkRequestData,
    strictOpenAiCompliance,
    commonRequestOptions.areSyncHooksAvailable,
  );

  if (!idkResponseBody) {
    throw new GatewayError('No response body from target');
  }

  const outputHookResponse = await outputHookHandler(
    c,
    idkRequestData,
    mappedResponse,
    idkResponseBody,
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
      idkTarget,
      isStreamingMode,
      idkRequestData,
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
