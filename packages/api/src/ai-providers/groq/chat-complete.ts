import type { GroqStreamChunk } from '@api/ai-providers/groq/types';
import { groqErrorResponseTransform } from '@api/ai-providers/groq/utils';
import { generateInvalidProviderResponseError } from '@api/utils/ai-provider';
import type {
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { AIProvider } from '@shared/types/constants';

export const groqChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if ('error' in aiProviderResponseBody && aiProviderResponseStatus !== 200) {
    return groqErrorResponseTransform(
      aiProviderResponseBody,
      aiProviderResponseStatus,
    );
  }

  if ('choices' in aiProviderResponseBody) {
    // Build response object explicitly to avoid including service_tier which Groq doesn't support
    // and may include with invalid values that cause OpenAI SDK validation errors

    // Type guard for response body
    if (
      typeof aiProviderResponseBody !== 'object' ||
      aiProviderResponseBody === null
    ) {
      return generateInvalidProviderResponseError(
        aiProviderResponseBody,
        AIProvider.GROQ,
      );
    }

    const rawResponse = aiProviderResponseBody as Record<string, unknown>;

    // Validate required fields exist
    if (
      !rawResponse.id ||
      !rawResponse.choices ||
      !Array.isArray(rawResponse.choices)
    ) {
      return generateInvalidProviderResponseError(
        aiProviderResponseBody,
        AIProvider.GROQ,
      );
    }

    // Build the response object field by field, explicitly excluding service_tier
    const result: Record<string, unknown> = {
      id: rawResponse.id,
      object: rawResponse.object,
      created: rawResponse.created,
      model: rawResponse.model,
      provider: AIProvider.GROQ,
      choices: rawResponse.choices,
      usage: rawResponse.usage,
    };

    // Only add system_fingerprint if it exists
    if (rawResponse.system_fingerprint) {
      result.system_fingerprint = rawResponse.system_fingerprint;
    }

    // Explicitly ensure service_tier is NOT included
    // Groq returns service_tier with value "on_demand" which is incompatible with OpenAI SDK
    // The OpenAI SDK expects service_tier to be either "scale" or "default" only
    // Removing this field ensures compatibility with OpenAI client libraries
    delete result.service_tier;

    return result as ChatCompletionResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.GROQ,
  );
};

export const groqChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    // Ensure responseChunk is a string
    const chunkStr =
      typeof responseChunk === 'string' ? responseChunk : String(responseChunk);
    let chunk = chunkStr.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    // Parse chunk with error handling
    let parsedChunk: GroqStreamChunk;
    try {
      parsedChunk = JSON.parse(chunk);
    } catch (error) {
      console.warn('Failed to parse Groq stream chunk:', {
        error: error instanceof Error ? error.message : String(error),
        chunkPreview: chunk.substring(0, 200),
      });
      return ''; // Return empty string to skip malformed chunks
    }

    // Handle usage metadata chunk (sent at end of stream)
    if (parsedChunk.x_groq?.usage && parsedChunk.choices?.[0]) {
      return `data: ${JSON.stringify({
        id: parsedChunk.id,
        object: parsedChunk.object,
        created: parsedChunk.created,
        model: parsedChunk.model,
        provider: AIProvider.GROQ,
        choices: [
          {
            index: parsedChunk.choices[0].index || 0,
            delta: {},
            logprobs: null,
            finish_reason: parsedChunk.choices[0].finish_reason,
          },
        ],
        usage: {
          prompt_tokens: parsedChunk.x_groq.usage.prompt_tokens || 0,
          completion_tokens: parsedChunk.x_groq.usage.completion_tokens || 0,
          total_tokens: parsedChunk.x_groq.usage.total_tokens || 0,
        },
      })}\n\n`;
    }
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.GROQ,
      choices:
        parsedChunk.choices && parsedChunk.choices.length > 0
          ? [
              {
                index: parsedChunk.choices[0].index || 0,
                delta: {
                  role: parsedChunk.choices[0].delta?.role || 'assistant',
                  content: parsedChunk.choices[0].delta?.content || '',
                  tool_calls: parsedChunk.choices[0].delta?.tool_calls || [],
                },
                logprobs: null,
                finish_reason: parsedChunk.choices[0].finish_reason || null,
              },
            ]
          : [],
      usage: parsedChunk.usage
        ? {
            prompt_tokens: parsedChunk.usage.prompt_tokens || 0,
            completion_tokens: parsedChunk.usage.completion_tokens || 0,
            total_tokens: parsedChunk.usage.total_tokens || 0,
          }
        : undefined,
    })}\n\n`;
  };
