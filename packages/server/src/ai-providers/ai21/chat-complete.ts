import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import {
  type ChatCompletionChoice,
  ChatCompletionFinishReason,
  type ChatCompletionRequestBody,
  type ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

export interface AI21ErrorResponse extends ErrorResponseBody {}

export const aI21ChatCompleteConfig: AIProviderFunctionConfig = {
  messages: [
    {
      param: 'messages',
      required: true,
      transform: (
        raRequestBody: ChatCompletionRequestBody,
      ): { role: ChatCompletionMessageRole; text: string }[] => {
        let inputMessages: ChatCompletionMessage[] = [];

        if (
          raRequestBody.messages?.[0]?.role &&
          Object.values(ChatCompletionMessageRole).includes(
            raRequestBody.messages?.[0]?.role,
          )
        ) {
          inputMessages = raRequestBody.messages.slice(1);
        } else if (raRequestBody.messages) {
          inputMessages = raRequestBody.messages;
        }

        return inputMessages.map((msg: ChatCompletionMessage) => ({
          text:
            typeof msg.content === 'string'
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.map((t) => t.text).join(' ')
                : '',
          role: msg.role,
        }));
      },
    },
    {
      param: 'system',
      required: false,
      transform: (raRequestBody: ChatCompletionRequestBody): string => {
        if (
          raRequestBody.messages?.[0]?.role &&
          Object.values(ChatCompletionMessageRole).includes(
            raRequestBody.messages?.[0]?.role,
          )
        ) {
          const content = raRequestBody.messages?.[0].content;
          return typeof content === 'string' ? content : '';
        }
        return '';
      },
    },
  ],
  n: {
    param: 'numResults',
    default: 1,
  },
  max_tokens: {
    param: 'maxTokens',
    default: 16,
  },
  max_completion_tokens: {
    param: 'maxTokens',
    default: 16,
  },
  minTokens: {
    param: 'minTokens',
    default: 0,
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'topP',
    default: 1,
  },
  top_k: {
    param: 'topKReturn',
    default: 0,
  },
  stop: {
    param: 'stopSequences',
  },
  presence_penalty: {
    param: 'presencePenalty',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return {
        scale: raRequestBody.presence_penalty,
      };
    },
  },
  frequency_penalty: {
    param: 'frequencyPenalty',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return {
        scale: raRequestBody.frequency_penalty,
      };
    },
  },
  countPenalty: {
    param: 'countPenalty',
  },
  frequencyPenalty: {
    param: 'frequencyPenalty',
  },
  presencePenalty: {
    param: 'presencePenalty',
  },
};

export const aI21ErrorResponseTransform: (
  response: Record<string, unknown>,
) => ErrorResponseBody = (response) => {
  if ('detail' in response) {
    return generateErrorResponse(
      {
        message: response.detail as string,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.AI21,
    );
  }

  return generateErrorResponse(
    {
      message: 'Unknown error',
      type: undefined,
      param: undefined,
      code: undefined,
    },
    AIProvider.AI21,
  );
};

export const aI21ChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  raRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = aI21ErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) return errorResponse;
  }

  if ('outputs' in aiProviderResponseBody) {
    const outputs = aiProviderResponseBody.outputs as {
      text: string;
      finishReason: { reason: string };
    }[];
    const usage = aiProviderResponseBody.usage as {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    const chatCompletionResponseBody: ChatCompletionResponseBody = {
      id: aiProviderResponseBody.id as string,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: (raRequestData.requestBody as ChatCompletionRequestBody).model,
      choices: outputs.map((o, index) => {
        const chatCompletionChoice: ChatCompletionChoice = {
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: o.text,
          },
          index: index,
          logprobs: null,
          finish_reason: o.finishReason?.reason
            ? (o.finishReason.reason as ChatCompletionFinishReason)
            : ChatCompletionFinishReason.STOP,
        };
        return chatCompletionChoice;
      }),
      usage: {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      },
    };
    return chatCompletionResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.AI21,
  );
};
