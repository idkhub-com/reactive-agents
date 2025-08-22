import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { workersAIErrorResponseTransform } from './utils';

export const workersAIChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'messages',
    required: true,
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      return idkRequestBody.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  model: {
    param: 'model',
    required: true,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  raw: {
    param: 'raw',
  },
  max_tokens: {
    param: 'max_tokens',
  },
  max_completion_tokens: {
    param: 'max_tokens',
  },
  temperature: {
    param: 'temperature',
  },
  top_p: {
    param: 'top_p',
  },
  top_k: {
    param: 'top_k',
  },
  frequency_penalty: {
    param: 'frequency_penalty',
  },
  presence_penalty: {
    param: 'presence_penalty',
  },
};

interface WorkersAIChatCompleteResponse {
  result: {
    response: string;
  };
  success: boolean;
  errors: string[];
  messages: string[];
  model: string;
}

export const workersAIChatCompleteResponseTransform: ResponseTransformFunction =
  (
    aiProviderResponseBody,
    aiProviderResponseStatus,
    _responseHeaders,
    _strictOpenAiCompliance,
    _idkRequestData,
  ) => {
    if (aiProviderResponseStatus !== 200) {
      return workersAIErrorResponseTransform(aiProviderResponseBody);
    }

    if ('result' in aiProviderResponseBody) {
      const response =
        aiProviderResponseBody as unknown as WorkersAIChatCompleteResponse;
      return {
        id: Date.now().toString(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        provider: AIProvider.WORKERS_AI,
        choices: [
          {
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: response.result.response,
            },
            index: 0,
            logprobs: null,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: -1,
          completion_tokens: -1,
          total_tokens: -1,
        },
      } as ChatCompletionResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.WORKERS_AI,
    );
  };
