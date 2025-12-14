import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import {
  type ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import type { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.
export const azureAIInferenceChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: false,
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (
      raRequestData: ChatCompletionRequestBody,
    ): ChatCompletionMessage[] | undefined => {
      if (!raRequestData.messages) return undefined;
      return raRequestData.messages.map((message) => {
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

export const azureAIInferenceChatCompleteResponseTransform = (
  provider: AIProvider,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return openAIErrorResponseTransform(aiProviderResponseBody, provider);
    }

    return ChatCompletionResponseBody.parse(aiProviderResponseBody);
  };
  return transformer;
};
