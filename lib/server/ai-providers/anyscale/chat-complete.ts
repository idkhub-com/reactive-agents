import type {
  AnyscaleChatCompleteResponse,
  AnyscaleStreamChunk,
} from '@server/ai-providers/anyscale/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const anyscaleChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'meta-llama/Llama-2-7b-chat-hf',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return raRequestBody.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER) {
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        }
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
  logprobs: {
    param: 'logprobs',
    default: false,
  },
  top_logprobs: {
    param: 'top_logprobs',
  },
};

export const anyscaleErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
): ErrorResponseBody => {
  if (
    'detail' in aiProviderResponseBody &&
    Array.isArray(aiProviderResponseBody.detail) &&
    aiProviderResponseBody.detail.length
  ) {
    let firstError: Record<string, unknown> | undefined;
    let errorField: string | null = null;
    let errorMessage: string | undefined;
    let errorType: string | null = null;

    if (Array.isArray(aiProviderResponseBody.detail)) {
      [firstError] = aiProviderResponseBody.detail;
      errorField = Array.isArray(firstError?.loc)
        ? firstError.loc.join('.')
        : '';
      errorMessage = typeof firstError?.msg === 'string' ? firstError.msg : '';
      errorType = typeof firstError?.type === 'string' ? firstError.type : null;
    } else {
      errorMessage = aiProviderResponseBody.detail;
    }

    return generateErrorResponse(
      {
        message: `${errorField ? `${errorField}: ` : ''}${errorMessage}`,
        type: errorType ?? undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.ANYSCALE,
    );
  }

  if ('error' in aiProviderResponseBody) {
    const error = aiProviderResponseBody.error as {
      message: string;
      type: string;
    };
    return generateErrorResponse(
      {
        message: error.message,
        type: error.type,
        param: undefined,
        code: undefined,
      },
      AIProvider.ANYSCALE,
    );
  }
  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.ANYSCALE,
  );
};

export const anyscaleChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      const errorResponse = anyscaleErrorResponseTransform(
        aiProviderResponseBody,
      );
      if (errorResponse) return errorResponse;
    }

    if ('choices' in aiProviderResponseBody) {
      const response = aiProviderResponseBody as AnyscaleChatCompleteResponse;
      return {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        provider: AIProvider.ANYSCALE,
        choices: response.choices,
        usage: response.usage,
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.ANYSCALE,
    );
  };

export const anyscaleChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }
    const parsedChunk: AnyscaleStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.ANYSCALE,
      choices: parsedChunk.choices,
    })}\n\n`;
  };
