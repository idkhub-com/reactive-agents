import { providerConfigs } from '@server/ai-providers';
import { openAIModelResponseJSONToStreamGenerator } from '@server/ai-providers/open-ai-base/create-model-response';
import { openAIChatCompleteJSONToStreamResponseTransform } from '@server/ai-providers/openai/chat-complete';
import { openAICompleteJSONToStreamResponseTransform } from '@server/ai-providers/openai/complete';
import { HttpError } from '@server/errors/http';
import type {
  JSONToStreamGeneratorTransformFunction,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
  ResponseTransformFunctionType,
} from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import type { ReactiveAgentsResponseBody } from '@shared/types/api/response/body';
import { type AIProvider, ContentTypeName } from '@shared/types/constants';
import { CacheStatus } from '@shared/types/middleware/cache';
import {
  handleAudioResponse,
  handleImageResponse,
  handleJSONToStreamResponse,
  handleNonStreamingMode,
  handleOctetStreamResponse,
  handleStreamingMode,
  handleTextResponse,
} from './stream-handler';

/**
 * Handles various types of responses based on the specified parameters
 * and returns a mapped response
 */
export async function responseHandler(
  response: Response,
  streamingMode: boolean,
  provider: AIProvider,
  responseTransformerFunctionName: FunctionName | undefined,
  aiProviderRequestURL: string,
  cacheStatus: CacheStatus,
  raRequestData: ReactiveAgentsRequestData,
  strictOpenAiCompliance: boolean,
  areSyncHooksAvailable: boolean,
  onFirstChunk?: () => void,
): Promise<{
  response: Response;
  raResponseBody: ReactiveAgentsResponseBody | null;
  originalResponseJson?: Record<string, unknown> | null;
}> {
  let responseTransformFunction: ResponseTransformFunctionType | undefined;
  const responseContentType = response.headers?.get('content-type');
  const isSuccessStatusCode = [200, 246].includes(response.status);

  const providerConfig = providerConfigs[provider];
  if (!providerConfig) {
    throw new HttpError('Provider not found', {
      status: 500,
      statusText: 'Provider not found',
      body: JSON.stringify({ error: 'Provider not found' }),
    });
  }
  let responseTransformFunctions = providerConfig?.responseTransforms;

  if (providerConfig?.getConfig) {
    responseTransformFunctions = providerConfig.getConfig(
      raRequestData.requestBody,
    ).responseTransforms;
  }

  // Checking status 200 so that errors are not considered as stream mode.
  if (responseTransformerFunctionName && streamingMode && isSuccessStatusCode) {
    responseTransformFunction = responseTransformFunctions?.[
      `stream_${responseTransformerFunctionName}` as FunctionName
    ] as ResponseTransformFunction | undefined;
  } else if (responseTransformerFunctionName) {
    responseTransformFunction = responseTransformFunctions?.[
      responseTransformerFunctionName
    ] as ResponseTransformFunction | undefined;
  }

  const isCacheHit =
    cacheStatus === CacheStatus.HIT || cacheStatus === CacheStatus.SEMANTIC_HIT;

  // JSON to text/event-stream conversion is only allowed for unified routes: chat completions and completions.
  // Set the transformer to OpenAI json to stream convertor function in that case.
  if (responseTransformerFunctionName && streamingMode && isCacheHit) {
    switch (responseTransformerFunctionName) {
      case FunctionName.CHAT_COMPLETE:
        responseTransformFunction =
          openAIChatCompleteJSONToStreamResponseTransform;
        break;
      case FunctionName.CREATE_MODEL_RESPONSE:
        responseTransformFunction = openAIModelResponseJSONToStreamGenerator;
        break;
      default:
        responseTransformFunction = openAICompleteJSONToStreamResponseTransform;
        break;
    }
  } else if (responseTransformerFunctionName && !streamingMode && isCacheHit) {
    responseTransformFunction = undefined;
  }

  if (
    streamingMode &&
    isSuccessStatusCode &&
    isCacheHit &&
    responseTransformFunction
  ) {
    const streamingResponse = await handleJSONToStreamResponse(
      response,
      provider,
      responseTransformFunction as JSONToStreamGeneratorTransformFunction,
    );
    return { response: streamingResponse, raResponseBody: null };
  }
  if (streamingMode && isSuccessStatusCode) {
    return {
      response: handleStreamingMode(
        response,
        provider,
        responseTransformFunction as ResponseChunkStreamTransformFunction,
        aiProviderRequestURL,
        raRequestData,
        strictOpenAiCompliance,
        onFirstChunk,
      ),
      raResponseBody: null,
    };
  }

  if (responseContentType?.startsWith(ContentTypeName.GENERIC_AUDIO_PATTERN)) {
    return { response: handleAudioResponse(response), raResponseBody: null };
  }

  if (
    responseContentType === ContentTypeName.APPLICATION_OCTET_STREAM ||
    responseContentType === ContentTypeName.BINARY_OCTET_STREAM
  ) {
    return {
      response: handleOctetStreamResponse(response),
      raResponseBody: null,
    };
  }

  if (responseContentType?.startsWith(ContentTypeName.GENERIC_IMAGE_PATTERN)) {
    return { response: handleImageResponse(response), raResponseBody: null };
  }

  if (
    responseContentType?.startsWith(ContentTypeName.PLAIN_TEXT) ||
    responseContentType?.startsWith(ContentTypeName.HTML)
  ) {
    const textResponse = await handleTextResponse(
      response,
      responseTransformFunction as ResponseTransformFunction | undefined,
      raRequestData,
    );
    return { response: textResponse, raResponseBody: null };
  }

  if (!responseContentType && response.status === 204) {
    return {
      response: new Response(response.body, response),
      raResponseBody: null,
    };
  }

  const nonStreamingResponse = await handleNonStreamingMode(
    response,
    responseTransformFunction as ResponseTransformFunction | undefined,
    strictOpenAiCompliance,
    raRequestData,
    areSyncHooksAvailable,
  );

  return {
    response: nonStreamingResponse.response,
    raResponseBody: nonStreamingResponse.raResponseBody,
    originalResponseJson: nonStreamingResponse.originalBodyJson,
  };
}
