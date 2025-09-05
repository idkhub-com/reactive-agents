import { generateErrorResponse } from '@server/utils/ai-provider';
import {
  analyzeError,
  enhanceErrorResponse,
  extractErrorTexts,
} from '@server/utils/error-classification-central';
import {
  getStreamModeSplitPattern,
  type SplitPatternType,
} from '@server/utils/object';
import type {
  JSONToStreamGeneratorTransformFunction,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { IdkRequestData } from '@shared/types/api/request/body';
import type {
  ErrorResponseBody,
  IdkResponseBody,
} from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import {
  AIProvider,
  ContentTypeName,
  PRECONDITION_CHECK_FAILED_STATUS_CODE,
  REQUEST_TIMEOUT_STATUS_CODE,
} from '@shared/types/constants';

// Helper function to clean response headers by removing compression-related headers
function cleanResponseHeaders(
  originalHeaders: Headers,
): Record<string, string> {
  const cleanedHeaders: Record<string, string> = {};
  const headersToExclude = new Set([
    'content-encoding',
    'content-length', // Will be wrong after decompression
    'transfer-encoding',
    'vary', // Often related to compression negotiation
  ]);

  for (const [key, value] of originalHeaders.entries()) {
    if (!headersToExclude.has(key.toLowerCase())) {
      cleanedHeaders[key] = value;
    }
  }

  return cleanedHeaders;
}

function readUInt32BE(buffer: Uint8Array, offset: number): number {
  return (
    ((buffer[offset] << 24) |
      (buffer[offset + 1] << 16) |
      (buffer[offset + 2] << 8) |
      buffer[offset + 3]) >>>
    0
  ); // Ensure the result is an unsigned integer
}

function getPayloadFromAWSChunk(chunk: Uint8Array): string {
  const decoder = new TextDecoder();
  const chunkLength = readUInt32BE(chunk, 0);
  const headersLength = readUInt32BE(chunk, 4);

  // prelude 8 + Prelude crc 4 = 12
  const headersEnd = 12 + headersLength;

  const payloadLength = chunkLength - headersEnd - 4; // Subtracting 4 for the message crc
  const payload = chunk.slice(headersEnd, headersEnd + payloadLength);
  const decodedJson = JSON.parse(decoder.decode(payload));
  return decodedJson.bytes
    ? Buffer.from(decodedJson.bytes, 'base64').toString()
    : JSON.stringify(decodedJson);
}

function concatenateUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0); // Copy contents of array 'a' into 'result' starting at index 0
  result.set(b, a.length); // Copy contents of array 'b' into 'result' starting at index 'a.length'
  return result;
}

export async function* readAWSStream(
  reader: ReadableStreamDefaultReader,
  transformFunction: ResponseChunkStreamTransformFunction | undefined,
  fallbackChunkId: string,
  strictOpenAiCompliance: boolean,
  idkRequestData: IdkRequestData,
): AsyncGenerator<string | Uint8Array, void, unknown> {
  let buffer = new Uint8Array() as Uint8Array<ArrayBufferLike>;
  let expectedLength = 0;
  const streamState = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.length) {
        expectedLength = readUInt32BE(buffer, 0);
        while (buffer.length >= expectedLength && buffer.length !== 0) {
          const data = buffer.subarray(0, expectedLength);
          buffer = buffer.subarray(expectedLength);
          expectedLength = readUInt32BE(buffer, 0);
          const payload = getPayloadFromAWSChunk(data);
          if (transformFunction) {
            const transformedChunk = transformFunction(
              payload,
              fallbackChunkId,
              streamState,
              strictOpenAiCompliance,
              idkRequestData,
            );
            if (Array.isArray(transformedChunk)) {
              for (const item of transformedChunk) {
                yield item;
              }
            } else {
              yield transformedChunk;
            }
          } else {
            yield data;
          }
        }
      }
      break;
    }

    if (expectedLength === 0) {
      expectedLength = readUInt32BE(value, 0);
    }

    buffer = concatenateUint8Arrays(buffer, value);

    while (buffer.length >= expectedLength && buffer.length !== 0) {
      const data = buffer.subarray(0, expectedLength);
      buffer = buffer.subarray(expectedLength);

      expectedLength = readUInt32BE(buffer, 0);
      const payload = getPayloadFromAWSChunk(data);

      if (transformFunction) {
        const transformedChunk = transformFunction(
          payload,
          fallbackChunkId,
          streamState,
          strictOpenAiCompliance,
          idkRequestData,
        );
        if (Array.isArray(transformedChunk)) {
          for (const item of transformedChunk) {
            yield item;
          }
        } else {
          yield transformedChunk;
        }
      } else {
        yield data;
      }
    }
  }
}

export async function* readStream(
  reader: ReadableStreamDefaultReader,
  splitPattern: SplitPatternType,
  transformFunction: ResponseChunkStreamTransformFunction | undefined,
  isSleepTimeRequired: boolean,
  fallbackChunkId: string,
  strictOpenAiCompliance: boolean,
  idkRequestData: IdkRequestData,
): AsyncGenerator<string | Uint8Array, void, unknown> {
  let buffer = '';
  const decoder = new TextDecoder();
  let isFirstChunk = true;
  const streamState = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.length > 0) {
        if (transformFunction) {
          const transformedChunk = transformFunction(
            buffer,
            fallbackChunkId,
            streamState,
            strictOpenAiCompliance,
            idkRequestData,
          );
          if (Array.isArray(transformedChunk)) {
            for (const item of transformedChunk) {
              yield item;
            }
          } else {
            yield transformedChunk;
          }
        } else {
          yield buffer;
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    // keep buffering until we have a complete chunk

    while (buffer.split(splitPattern).length > 1) {
      const parts = buffer.split(splitPattern);
      const lastPart = parts.pop() ?? ''; // remove the last part from the array and keep it in buffer
      for (const part of parts) {
        // Some providers send ping event which can be ignored during parsing

        if (part.length > 0) {
          if (isFirstChunk) {
            isFirstChunk = false;
            await new Promise((resolve) => setTimeout(resolve, 25));
          } else if (isSleepTimeRequired) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          if (transformFunction) {
            const transformedChunk = transformFunction(
              part,
              fallbackChunkId,
              streamState,
              strictOpenAiCompliance,
              idkRequestData,
            );
            if (Array.isArray(transformedChunk)) {
              for (const item of transformedChunk) {
                yield item;
              }
            } else {
              yield transformedChunk;
            }
          } else {
            yield part + splitPattern;
          }
        }
      }

      buffer = lastPart; // keep the last part (after the last '\n\n') in buffer
    }
  }
}

export async function handleTextResponse(
  aiProviderResponse: Response,
  responseTransformer: ResponseTransformFunction | undefined,
  idkRequestData: IdkRequestData,
): Promise<Response> {
  const text = await aiProviderResponse.text();

  if (responseTransformer) {
    const transformedText = responseTransformer(
      { 'html-message': text },
      aiProviderResponse.status,
      aiProviderResponse.headers,
      false,
      idkRequestData,
    );
    return new Response(JSON.stringify(transformedText), {
      ...aiProviderResponse,
      status: aiProviderResponse.status,
      headers: new Headers({
        ...cleanResponseHeaders(aiProviderResponse.headers),
        'content-type': 'application/json',
      }),
    });
  }

  return new Response(text, aiProviderResponse);
}

export async function handleNonStreamingMode(
  aiProviderResponse: Response,
  responseTransformer: ResponseTransformFunction | undefined,
  strictOpenAiCompliance: boolean,
  idkRequestData: IdkRequestData,
  areSyncHooksAvailable: boolean,
): Promise<{
  response: Response;
  idkResponseBody: IdkResponseBody | null;
  originalBodyJson?: Record<string, unknown> | null;
}> {
  // 408 is thrown whenever a request takes more than request_timeout to respond.
  // In that case, response thrown by gateway is already in OpenAI format.
  // So no need to transform it again.
  if (
    [
      REQUEST_TIMEOUT_STATUS_CODE,
      PRECONDITION_CHECK_FAILED_STATUS_CODE,
    ].includes(aiProviderResponse.status)
  ) {
    return {
      response: aiProviderResponse,
      idkResponseBody: await aiProviderResponse.clone().json(),
    };
  }

  let originalResponseBodyJson: Record<string, unknown> | null = null;
  const originalResponseBodyText: string = await aiProviderResponse.text();
  try {
    originalResponseBodyJson = JSON.parse(originalResponseBodyText);
  } catch {
    // Maybe the response is not meant to be JSON. Do nothing.
  }

  let transformedBodyJson: Record<string, unknown> | Blob | null =
    originalResponseBodyJson;
  if (responseTransformer && originalResponseBodyJson) {
    transformedBodyJson = responseTransformer(
      originalResponseBodyJson,
      aiProviderResponse.status,
      aiProviderResponse.headers,
      strictOpenAiCompliance,
      idkRequestData,
    );
  }

  // Apply centralized error classification for ALL 37+ providers automatically
  let finalStatus = aiProviderResponse.status;
  if (!aiProviderResponse.ok) {
    if (transformedBodyJson && typeof transformedBodyJson === 'object') {
      // Case 1: Provider has error transformer - enhance the transformed error
      const isErrorResponse =
        'error' in transformedBodyJson || 'provider' in transformedBodyJson;
      if (isErrorResponse) {
        const enhancedError = enhanceErrorResponse(
          transformedBodyJson as ErrorResponseBody,
          aiProviderResponse.status,
          originalResponseBodyJson || undefined,
        );
        transformedBodyJson = enhancedError;
        finalStatus = enhancedError.status || aiProviderResponse.status;
      }
    } else if (
      originalResponseBodyJson &&
      typeof originalResponseBodyJson === 'object'
    ) {
      // Case 2: Provider has no error transformer - create error response from raw data
      const analysis = analyzeError(
        originalResponseBodyJson,
        aiProviderResponse.status,
      );

      // Extract error message from raw response (works with any format)
      const errorTexts = extractErrorTexts(originalResponseBodyJson);
      const primaryErrorMessage =
        errorTexts.find((text) => text.length > 0) || 'Unknown error occurred';

      const errorResponse = generateErrorResponse(
        {
          message: primaryErrorMessage,
          type: 'unknown_error',
        },
        'unknown', // Provider name not available here
      );

      // Apply error analysis to enhance the response
      if (analysis) {
        errorResponse.error_details = {
          original_error: originalResponseBodyJson || {},
          original_message: errorResponse.error.message,
          classification: analysis.classification,
          ...(analysis.genericMessage && {
            suggested_action: analysis.genericMessage,
          }),
        };
        if (analysis.statusCode) {
          errorResponse.status = analysis.statusCode;
        }
      }

      const enhancedError = enhanceErrorResponse(
        errorResponse,
        aiProviderResponse.status,
        originalResponseBodyJson || undefined,
      );

      transformedBodyJson = enhancedError;
      finalStatus = enhancedError.status || aiProviderResponse.status;
    }
  }

  // Make sure that the response body is in the expected format.
  let idkResponseBody: IdkResponseBody | null = null;
  if (transformedBodyJson) {
    // For error responses, don't validate against success schema
    const isErrorResponse =
      'error' in transformedBodyJson ||
      'provider' in transformedBodyJson ||
      !aiProviderResponse.ok;

    if (isErrorResponse) {
      // For error responses, use the transformed body as-is
      idkResponseBody = transformedBodyJson as IdkResponseBody;
    } else {
      // For success responses, validate against the expected schema
      const idkResponseBodyParseResult =
        idkRequestData.responseSchema.safeParse(transformedBodyJson);
      if (!idkResponseBodyParseResult.success) {
        throw new Error(
          `Invalid response body: ${idkResponseBodyParseResult.error}`,
        );
      }
      idkResponseBody = idkResponseBodyParseResult.data as IdkResponseBody;
    }
  }
  if (!areSyncHooksAvailable) {
    return {
      response: new Response(
        idkResponseBody
          ? JSON.stringify(idkResponseBody)
          : originalResponseBodyText,
        {
          ...aiProviderResponse,
          status: finalStatus,
          headers: new Headers(
            cleanResponseHeaders(aiProviderResponse.headers),
          ),
        },
      ),
      idkResponseBody, // TODO: Review if this is necessary
      originalBodyJson:
        transformedBodyJson instanceof Blob ? null : transformedBodyJson,
    };
  }

  return {
    response: new Response(JSON.stringify(idkResponseBody), {
      ...aiProviderResponse,
      status: finalStatus,
      headers: new Headers(cleanResponseHeaders(aiProviderResponse.headers)),
    }),
    idkResponseBody,
    // Send original response if transformer exists
    ...(responseTransformer && {
      originalBodyJson:
        transformedBodyJson instanceof Blob ? null : transformedBodyJson,
    }),
  };
}

export function handleAudioResponse(response: Response): Response {
  return new Response(response.body, response);
}

export function handleOctetStreamResponse(response: Response): Response {
  return new Response(response.body, response);
}

export function handleImageResponse(response: Response): Response {
  return new Response(response.body, response);
}

export function handleStreamingMode(
  response: Response,
  provider: AIProvider,
  responseTransformer: ResponseChunkStreamTransformFunction | undefined,
  aiProviderRequestURL: string,
  idkRequestData: IdkRequestData,
  strictOpenAiCompliance: boolean,
): Response {
  const splitPattern = getStreamModeSplitPattern(
    provider,
    aiProviderRequestURL,
  );
  // If the provider doesn't supply completion id,
  // we generate a fallback id using the provider name + timestamp.
  const fallbackChunkId = `${provider}-${Date.now().toString()}`;

  if (!response.body) {
    throw new Error('Response format is invalid. Body not found');
  }
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = response.body.getReader();
  const isSleepTimeRequired = provider === AIProvider.AZURE_OPENAI;
  const encoder = new TextEncoder();

  if (provider === AIProvider.BEDROCK) {
    (async () => {
      for await (const chunk of readAWSStream(
        reader,
        responseTransformer,
        fallbackChunkId,
        strictOpenAiCompliance,
        idkRequestData,
      )) {
        await writer.write(encoder.encode(chunk as string));
      }
      writer.close();
    })();
  } else {
    (async () => {
      for await (const chunk of readStream(
        reader,
        splitPattern,
        responseTransformer,
        isSleepTimeRequired,
        fallbackChunkId,
        strictOpenAiCompliance,
        idkRequestData,
      )) {
        await writer.write(encoder.encode(chunk as string));
      }
      writer.close();
    })();
  }

  // Convert GEMINI/COHERE json stream to text/event-stream for non-proxy calls
  const isGoogleCohereOrBedrock = [
    AIProvider.GOOGLE,
    AIProvider.COHERE,
    AIProvider.BEDROCK,
  ].includes(provider);
  // const isVertexLlama =
  //   proxyProvider === AIProviderName.enum['vertex-ai'] &&
  //   responseTransformer?.name ===
  //     VertexLlamaChatCompleteStreamChunkTransform.name;
  // const isJsonStream = isGoogleCohereOrBedrock || isVertexLlama;
  const isJsonStream = isGoogleCohereOrBedrock;
  if (isJsonStream && responseTransformer) {
    return new Response(readable, {
      ...response,
      headers: new Headers({
        ...cleanResponseHeaders(response.headers),
        'content-type': 'text/event-stream',
      }),
    });
  }

  return new Response(readable, response);
}

export async function handleJSONToStreamResponse(
  response: Response,
  provider: AIProvider,
  responseTransformerFunction: JSONToStreamGeneratorTransformFunction,
): Promise<Response> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const responseJSON: ChatCompletionResponseBody | CompletionResponseBody =
    await response.clone().json();

  if (
    Object.prototype.toString.call(responseTransformerFunction) ===
    '[object GeneratorFunction]'
  ) {
    const generator = responseTransformerFunction(responseJSON, provider);
    (async () => {
      while (true) {
        const chunk = generator.next();
        if (chunk.done) {
          break;
        }
        await writer.write(encoder.encode(chunk.value));
      }
      writer.close();
    })();
  } else {
    const streamChunkArray = responseTransformerFunction(
      responseJSON,
      provider,
    );
    (async () => {
      for (const chunk of streamChunkArray) {
        await writer.write(encoder.encode(chunk));
      }
      writer.close();
    })();
  }

  return new Response(readable, {
    headers: new Headers({
      ...cleanResponseHeaders(response.headers),
      'content-type': ContentTypeName.EVENT_STREAM,
    }),
    status: response.status,
    statusText: response.statusText,
  });
}
