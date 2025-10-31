import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';

import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { nanoid } from 'nanoid';
import { huggingfaceErrorResponseTransform } from './utils';

export const huggingfaceChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (params: ChatCompletionRequestBody) => {
      return params.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  functions: {
    param: 'functions',
  },
  function_call: {
    param: 'function_call',
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
  n: {
    param: 'n',
    default: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  stop: {
    param: 'stop',
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    min: -2,
    max: 2,
  },
  logit_bias: {
    param: 'logit_bias',
  },
  user: {
    param: 'user',
  },
  tools: {
    param: 'tools',
  },
  tool_choice: {
    param: 'tool_choice',
  },
  response_format: {
    param: 'response_format',
  },
};

export const huggingfaceChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if ('error' in aiProviderResponseBody && aiProviderResponseStatus !== 200) {
      return huggingfaceErrorResponseTransform(
        aiProviderResponseBody,
        aiProviderResponseStatus,
      );
    }

    if ('choices' in aiProviderResponseBody) {
      const responseBody = {
        ...aiProviderResponseBody,
      } as unknown as ChatCompletionResponseBody;
      return responseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as unknown as Record<string, unknown>,
      AIProvider.HUGGINGFACE,
    );
  };

export const huggingfaceChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    if (chunk.startsWith('event: ping')) {
      return '';
    }

    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return 'data: [DONE]\n\n';
    }
    const parsedChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      ...parsedChunk,
      id: `ra-${nanoid()}`,
      provider: AIProvider.HUGGINGFACE,
    })}\n\n`;
  };
