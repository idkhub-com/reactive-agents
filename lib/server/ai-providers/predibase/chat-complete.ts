import type { PredibaseChatCompletionStreamChunk } from '@server/ai-providers/predibase/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
  splitString,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  ChatCompletionFinishReason,
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

const PREDIBASE = AIProvider.PREDIBASE;

export const predibaseChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: false,
    default: '',
    /*
    The Predibase model format is "<base_model>[:adapter_id]",
    where adapter_id format is "<adapter_repository_reference/version_number"
    (version_number is required).
    */
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      const model = idkRequestBody.model;
      return [
        {
          role: ChatCompletionMessageRole.SYSTEM,
          content: model ? splitString(model, ':').after : '',
        },
      ];
    },
  },
  messages: {
    param: 'messages',
    required: true,
    default: [],
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      return (
        idkRequestBody.messages?.map((message) => {
          if (message.role === ChatCompletionMessageRole.DEVELOPER)
            return { ...message, role: ChatCompletionMessageRole.SYSTEM };
          return message;
        }) || []
      );
    },
  },
  max_tokens: {
    param: 'max_tokens',
    required: false,
    default: 4096,
    min: 0,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    required: false,
    default: 4096,
    min: 0,
  },
  temperature: {
    param: 'temperature',
    required: false,
    default: 0.1,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    required: false,
    default: 1,
    min: 0,
    max: 1,
  },
  response_format: {
    param: 'response_format',
    required: false,
  },
  stream: {
    param: 'stream',
    required: false,
    default: false,
  },
  n: {
    param: 'n',
    required: false,
    default: 1,
    max: 1,
    min: 1,
  },
  stop: {
    param: 'stop',
    required: false,
  },
  top_k: {
    param: 'top_k',
    required: false,
    default: -1,
  },
  best_of: {
    param: 'best_of',
    required: false,
  },
};

export const predibaseChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if ('error' in aiProviderResponseBody && aiProviderResponseStatus !== 200) {
      const error = aiProviderResponseBody.error as {
        message: string;
        type: string;
        code: string;
      };
      return generateErrorResponse(
        {
          message: error.message,
          type: error.type,
          param: undefined,
          code: error.code?.toString() || undefined,
        },
        PREDIBASE,
      );
    }

    if ('choices' in aiProviderResponseBody) {
      const choices = aiProviderResponseBody.choices as {
        index: number;
        message: {
          role: string;
          content: string;
        };
        logprobs: {
          token_logprobs: number[];
          top_logprobs: Record<string, number>[];
          text_offset: number[];
        };
        finish_reason: string;
      }[];
      const usage = aiProviderResponseBody.usage as {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      const responseBody: ChatCompletionResponseBody = {
        id: aiProviderResponseBody.id as string,
        object: aiProviderResponseBody.object as 'chat.completion',
        created: aiProviderResponseBody.created as number,
        model: aiProviderResponseBody.model as string,
        choices: choices.map((choice) => ({
          index: choice.index,
          message: {
            role: choice.message.role as ChatCompletionMessageRole,
            content: choice.message.content,
          },
          logprobs: {
            token_logprobs: choice.logprobs.token_logprobs,
            top_logprobs: choice.logprobs.top_logprobs,
            text_offset: choice.logprobs.text_offset,
            content: null,
          },
          finish_reason: choice.finish_reason as ChatCompletionFinishReason,
        })),
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0,
        },
      };
      return responseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      PREDIBASE,
    );
  };

export const predibaseChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data:\s*/, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk = JSON.parse(chunk);

    if (!parsedChunk || typeof parsedChunk !== 'object') {
      throw new Error('Invalid chunk format');
    }

    if ('error' in parsedChunk && 'error_type' in parsedChunk) {
      return `data: ${JSON.stringify({
        id: null,
        object: null,
        created: null,
        model: null,
        provider: PREDIBASE,
        choices: [
          {
            index: 0,
            delta: {
              role: parsedChunk.error_type,
              content: parsedChunk.error,
            },
            finish_reason: 'error',
          },
        ],
      })}\n\n`;
    }

    const typedChunk = parsedChunk as PredibaseChatCompletionStreamChunk;
    return `data: ${JSON.stringify({
      id: typedChunk.id,
      object: typedChunk.object,
      created: typedChunk.created,
      model: typedChunk.model,
      provider: PREDIBASE,
      choices: [
        {
          index: typedChunk.choices[0].index,
          delta: typedChunk.choices[0].delta,
          finish_reason: typedChunk.choices[0].finish_reason,
        },
      ],
      ...(typedChunk.usage ? { usage: typedChunk.usage } : {}),
    })}\n\n`;
  };
