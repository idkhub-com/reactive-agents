import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

interface RekaMessageItem {
  text: string;
  media_url?: string;
  type: 'human' | 'model';
}

export const rekaAIChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model_name',
    required: true,
    default: 'reka-flash',
  },
  messages: {
    param: 'conversation_history',
    transform: (
      idkRequestBody: ChatCompletionRequestBody,
    ): Record<string, unknown> => {
      const messages: RekaMessageItem[] = [];
      let lastType: 'human' | 'model' | undefined;

      const addMessage = ({
        type,
        text,
        media_url,
      }: {
        type: 'human' | 'model';
        text: string;
        media_url?: string;
      }): void => {
        // NOTE: can't have more than one image in conversation history
        if (media_url && messages[0]?.media_url) {
          return;
        }

        const newMessage: RekaMessageItem = { type, text, media_url };

        if (lastType === type) {
          const placeholder: RekaMessageItem = {
            type: type === 'human' ? 'model' : 'human',
            text: 'Placeholder for alternation',
          };
          media_url
            ? messages.unshift(placeholder)
            : messages.push(placeholder);
        }

        // NOTE: image need to be first
        media_url ? messages.unshift(newMessage) : messages.push(newMessage);
        lastType = type;
      };

      idkRequestBody.messages?.forEach((message) => {
        const currentType: 'human' | 'model' =
          message.role === 'user' ? 'human' : 'model';

        if (!Array.isArray(message.content)) {
          addMessage({ type: currentType, text: message.content || '' });
        } else {
          message.content.forEach((item) => {
            addMessage({
              type: currentType,
              text: item.text || '',
              media_url: item.image_url?.url,
            });
          });
        }
      });

      if (messages[0]?.type !== 'human') {
        messages.unshift({
          type: 'human',
          text: 'Placeholder for alternation',
        });
      }
      return messages as unknown as Record<string, unknown>;
    },
  },
  max_tokens: {
    param: 'request_output_len',
  },
  max_completion_tokens: {
    param: 'request_output_len',
  },
  temperature: {
    param: 'temperature',
  },
  top_p: {
    param: 'runtime_top_p',
  },
  stop: {
    param: 'stop_words',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      if (idkRequestBody.stop && !Array.isArray(idkRequestBody.stop)) {
        return [idkRequestBody.stop];
      }

      return idkRequestBody.stop;
    },
  },
  seed: {
    param: 'random_seed',
  },
  frequency_penalty: {
    param: 'frequency_penalty',
  },
  presence_penalty: {
    param: 'presence_penalty',
  },
  // the following are reka specific
  top_k: {
    param: 'runtime_top_k',
  },
  length_penalty: {
    param: 'length_penalty',
  },
  retrieval_dataset: {
    param: 'retrieval_dataset',
  },
  use_search_engine: {
    param: 'use_search_engine',
  },
};

export interface RekaAIChatCompleteResponse {
  type: string;
  text: string;
  finish_reason: string;
  metadata: {
    input_tokens: number;
    generated_tokens: number;
  };
}

export interface RekaAIErrorResponse {
  detail: unknown; // could be string or array
}

export const rekaAIChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const response = aiProviderResponseBody as unknown as RekaAIErrorResponse;
    if ('detail' in response) {
      return generateErrorResponse(
        {
          message: JSON.stringify(response.detail),
          type: undefined,
          param: undefined,
          code: undefined,
        },
        AIProvider.REKA_AI,
      );
    }
  }

  if ('text' in aiProviderResponseBody) {
    const response =
      aiProviderResponseBody as unknown as RekaAIChatCompleteResponse;
    return {
      id: crypto.randomUUID(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'Unknown',
      provider: AIProvider.REKA_AI,
      choices: [
        {
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: response.text,
          },
          index: 0,
          logprobs: null,
          finish_reason: response.finish_reason as ChatCompletionFinishReason,
        },
      ],
      usage: {
        prompt_tokens: response.metadata.input_tokens,
        completion_tokens: response.metadata.generated_tokens,
        total_tokens:
          response.metadata.input_tokens + response.metadata.generated_tokens,
      },
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as Record<string, unknown>,
    AIProvider.REKA_AI,
  );
};
