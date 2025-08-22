import type { GroqStreamChunk } from '@server/ai-providers/groq/types';
import { groqErrorResponseTransform } from '@server/ai-providers/groq/utils';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
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
    const chatCompleteResponseBody =
      aiProviderResponseBody as ChatCompletionResponseBody;

    return {
      id: chatCompleteResponseBody.id,
      object: chatCompleteResponseBody.object,
      created: chatCompleteResponseBody.created,
      model: chatCompleteResponseBody.model,
      provider: AIProvider.GROQ,
      choices: chatCompleteResponseBody.choices.map((c) => ({
        index: c.index,
        message: c.message,
        logprobs: c.logprobs,
        finish_reason: c.finish_reason,
      })),
      usage: {
        prompt_tokens: chatCompleteResponseBody.usage?.prompt_tokens || 0,
        completion_tokens:
          chatCompleteResponseBody.usage?.completion_tokens || 0,
        total_tokens: chatCompleteResponseBody.usage?.total_tokens || 0,
      },
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.GROQ,
  );
};

export const groqChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk: GroqStreamChunk = JSON.parse(chunk);
    if (parsedChunk.x_groq?.usage) {
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
                  role: 'assistant',
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
