import type {
  DeepSeekChatCompleteResponse,
  DeepSeekStreamChunk,
} from '@api/ai-providers/deepseek/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@api/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

export const deepSeekChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'deepseek-chat',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (saRequestBody: ChatCompletionRequestBody) => {
      if (!saRequestBody.messages) return [];
      return saRequestBody.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 2,
  },
  top_p: {
    param: 'top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  stop: {
    param: 'stop',
    default: null,
  },
  logprobs: {
    param: 'logprobs',
    default: false,
  },
  top_logprobs: {
    param: 'top_logprobs',
    default: 0,
    min: 0,
    max: 20,
  },
  tools: {
    param: 'tools',
  },
  tool_choice: {
    param: 'tool_choice',
  },
  response_format: {
    param: 'response_format',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      const format = raRequestBody.response_format;
      if (!format) return undefined;

      // DeepSeek only supports json_object, not json_schema
      if (typeof format === 'object' && 'type' in format) {
        if (format.type === 'json_schema') {
          throw new Error(
            'DeepSeek does not support json_schema response format. Use { type: "json_object" } instead.',
          );
        }
      }

      return format;
    },
  },
};

export const deepSeekChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (
      'message' in aiProviderResponseBody &&
      aiProviderResponseStatus !== 200
    ) {
      return generateErrorResponse(
        {
          message: aiProviderResponseBody.message as string,
          type: aiProviderResponseBody.type as string,
          param: aiProviderResponseBody.param as string | undefined,
          code: aiProviderResponseBody.code as string,
        },
        AIProvider.DEEPSEEK,
      );
    }

    if ('choices' in aiProviderResponseBody) {
      const response =
        aiProviderResponseBody as unknown as DeepSeekChatCompleteResponse;

      // Validate required fields
      if (!response.id || !Array.isArray(response.choices)) {
        return generateInvalidProviderResponseError(
          aiProviderResponseBody,
          AIProvider.DEEPSEEK,
        );
      }

      return {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        provider: AIProvider.DEEPSEEK,
        choices: response.choices.map((choice) => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
            ...(choice.message.tool_calls && {
              tool_calls: choice.message.tool_calls,
            }),
          },
          finish_reason: choice.finish_reason,
        })),
        usage: response.usage
          ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.DEEPSEEK,
    );
  };

export const deepSeekChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = String(responseChunk).trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }
    const parsedChunk: DeepSeekStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.DEEPSEEK,
      choices: parsedChunk.choices.map((choice) => ({
        index: choice.index,
        delta: choice.delta,
        finish_reason: choice.finish_reason,
      })),
      usage: parsedChunk.usage,
    })}\n\n`;
  };
