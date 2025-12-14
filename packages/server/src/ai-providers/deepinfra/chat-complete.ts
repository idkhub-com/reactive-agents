import type { DeepInfraChatCompleteResponse } from '@server/ai-providers/deepinfra/types';
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

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.
// TODOS: this configuration might have to check on the max value of n

export const deepInfraChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'deepinfra/airoboros-70b',
  },
  messages: {
    param: 'messages',
    required: true,
    default: [],
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return raRequestBody.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 1,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 1,
  },
  n: {
    param: 'n',
    default: 1,
    min: 1,
    max: 1,
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
    default: 0,
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
  stop: {
    param: 'stop',
    default: null,
  },
  stream: {
    param: 'stream',
    default: false,
  },
};

interface DeepInfraStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: {
      role?: string | null;
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const deepInfraChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (
      'detail' in aiProviderResponseBody &&
      aiProviderResponseStatus !== 200 &&
      (aiProviderResponseBody.detail as string | string[]).length
    ) {
      let firstError: Record<string, unknown> | undefined;
      let errorField: string | null = null;
      let errorMessage: string | undefined;
      let errorType: string | null = null;

      if (Array.isArray(aiProviderResponseBody.detail)) {
        [firstError] = aiProviderResponseBody.detail;
        if (firstError) {
          errorField = Array.isArray(firstError.loc)
            ? firstError.loc.join('.')
            : '';
          errorMessage =
            typeof firstError.msg === 'string' ? firstError.msg : undefined;
          errorType =
            typeof firstError.type === 'string' ? firstError.type : null;
        }
      } else {
        errorMessage = String(aiProviderResponseBody.detail);
      }

      return generateErrorResponse(
        {
          message: `${errorField ? `${errorField}: ` : ''}${errorMessage}`,
          type: errorType ?? undefined,
          param: undefined,
          code: undefined,
        },
        AIProvider.DEEPINFRA,
      );
    }

    if ('choices' in aiProviderResponseBody) {
      const response =
        aiProviderResponseBody as unknown as DeepInfraChatCompleteResponse;

      return {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        provider: AIProvider.DEEPINFRA,
        choices: response.choices.map((c) => ({
          index: c.index,
          message: {
            role: c.message.role,
            content: c.message.content,
          },
          finish_reason: c.finish_reason,
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
      AIProvider.DEEPINFRA,
    );
  };

export const deepInfraChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    // Matches a ping chunk `: ping - 2025-04-13 03:55:09.637341+00:00`
    if (
      responseChunk.match(
        /^:\s*ping\s*-\s*\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/,
      )
    ) {
      return '';
    }

    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }
    const parsedChunk: DeepInfraStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.DEEPINFRA,
      choices: [
        {
          index: parsedChunk.choices[0].index,
          delta: parsedChunk.choices[0].delta,
          finish_reason: parsedChunk.choices[0].finish_reason,
        },
      ],
      usage: parsedChunk.usage
        ? {
            prompt_tokens: parsedChunk.usage.prompt_tokens,
            completion_tokens: parsedChunk.usage.completion_tokens,
            total_tokens: parsedChunk.usage.total_tokens,
          }
        : undefined,
    })}\n\n`;
  };
