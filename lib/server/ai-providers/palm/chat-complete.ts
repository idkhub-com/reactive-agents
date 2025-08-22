import { googleErrorResponseTransform } from '@server/ai-providers/google/chat-complete';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import {
  ChatCompletionFinishReason,
  type ChatCompletionRequestBody,
  type ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const palmChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'model/chat-bison-001',
  },
  messages: {
    param: 'prompt',
    default: '',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      const { messages } = idkRequestBody;
      const palmMessages = messages?.map((message) => ({
        author:
          message.role === ChatCompletionMessageRole.DEVELOPER
            ? 'system'
            : message.role,
        content: message.content,
      }));
      const prompt = {
        messages: palmMessages,
        // examples, // TODO: Move to header config
        // context, // TODO: Move to header config
      };
      return prompt;
    },
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'topP',
    default: 1,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'topK',
    default: 1,
    min: 0,
    max: 1,
  },
  n: {
    param: 'candidateCount',
    default: 1,
    min: 1,
    max: 8,
  },
  max_tokens: {
    param: 'maxOutputTokens',
    default: 100,
    min: 1,
  },
  max_completion_tokens: {
    param: 'maxOutputTokens',
    default: 100,
    min: 1,
  },
  stop: {
    param: 'stopSequences',
  },
};

export const palmChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = googleErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.PALM,
    );
    if (errorResponse) return errorResponse;
  }

  if ('candidates' in aiProviderResponseBody) {
    const candidates = aiProviderResponseBody.candidates as {
      content: string;
    }[];
    const palmResponse: ChatCompletionResponseBody = {
      id: Date.now().toString(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'Unknown',
      choices:
        candidates.map((generation, index) => ({
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: generation.content ?? '',
          },
          index: index,
          finish_reason: ChatCompletionFinishReason.LENGTH,
        })) ?? [],
    };
    return palmResponse;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.PALM,
  );
};
