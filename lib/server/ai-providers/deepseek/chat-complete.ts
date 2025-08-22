import type { DeepSeekChatCompleteResponse } from '@server/ai-providers/deepseek/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
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
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      if (!idkRequestBody.messages) return [];
      return idkRequestBody.messages?.map((message) => {
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
};

interface DeepSeekStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    delta: {
      role?: string | null;
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

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

      return {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        provider: AIProvider.DEEPSEEK,
        choices: response.choices.map((choices) => ({
          index: choices.index,
          message: {
            role: choices.message.role,
            content: choices.message.content,
          },
          finish_reason: choices.finish_reason,
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens,
          completion_tokens: response.usage?.completion_tokens,
          total_tokens: response.usage?.total_tokens,
        },
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.DEEPSEEK,
    );
  };

export const deepSeekChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
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
      choices: [
        {
          index: parsedChunk.choices[0].index,
          delta: parsedChunk.choices[0].delta,
          finish_reason: parsedChunk.choices[0].finish_reason,
        },
      ],
      usage: parsedChunk.usage,
    })}\n\n`;
  };
