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
import type {
  ChatCompletionFinishReason,
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const togetherAIChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
  },
  messages: {
    param: 'messages',
    required: true,
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
  max_tokens: [
    {
      param: 'max_tokens',
      required: true,
      default: 128,
      min: 1,
      transform: (raRequestBody: ChatCompletionRequestBody): number => {
        return (
          raRequestBody.max_completion_tokens ?? raRequestBody.max_tokens ?? 128
        );
      },
    },
    {
      param: 'max_completion_tokens',
      transform: (): undefined => undefined,
    },
  ],
  stop: {
    param: 'stop',
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: 0.9,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'top_k',
    default: 40,
    min: 1,
  },
  frequency_penalty: {
    param: 'repetition_penalty',
    default: 1.0,
    min: 0.1,
    max: 2.0,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  logprobs: {
    param: 'logprobs',
    default: false,
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
  n: {
    param: 'n',
    default: 1,
    min: 1,
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  user: {
    param: 'user',
  },
};

export interface TogetherAIChatCompleteResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: {
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TogetherAIErrorResponse {
  model?: string;
  job_id?: string;
  request_id?: string;
  error:
    | string
    | {
        message: string;
        type?: string;
        param?: string;
        code?: string;
      };
  message?: string;
  type?: string;
}

export interface TogetherAIChatCompletionStreamChunk {
  id: string;
  model: string;
  request_id?: string;
  object: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export const togetherAIErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
): ErrorResponseBody => {
  const response = aiProviderResponseBody as unknown as TogetherAIErrorResponse;

  if ('error' in response && typeof response.error === 'string') {
    return generateErrorResponse(
      {
        message: response.error,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.TOGETHER_AI,
    );
  }

  if (
    'error' in response &&
    typeof response.error === 'object' &&
    response.error
  ) {
    return generateErrorResponse(
      {
        message: response.error.message || '',
        type: response.error.type || undefined,
        param: response.error.param || undefined,
        code: response.error.code || undefined,
      },
      AIProvider.TOGETHER_AI,
    );
  }

  if ('message' in response && response.message) {
    return generateErrorResponse(
      {
        message: response.message,
        type: response.type || undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.TOGETHER_AI,
    );
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.TOGETHER_AI,
  );
};

export const togetherAIChatCompleteResponseTransform: ResponseTransformFunction =
  (
    aiProviderResponseBody,
    aiProviderResponseStatus,
    _responseHeaders,
    _strictOpenAiCompliance,
    raRequestData,
  ) => {
    if (aiProviderResponseStatus !== 200) {
      const errorResponse = togetherAIErrorResponseTransform(
        aiProviderResponseBody,
      );
      if (errorResponse) return errorResponse;
    }

    if ('choices' in aiProviderResponseBody) {
      const response =
        aiProviderResponseBody as unknown as TogetherAIChatCompleteResponse;
      const _requestBody =
        raRequestData.requestBody as unknown as ChatCompletionRequestBody;

      const responseBody: ChatCompletionResponseBody = {
        id: response.id,
        object: response.object as 'chat.completion',
        created: response.created,
        model: response.model,
        choices: response.choices.map((choice, index) => ({
          message: {
            role: choice.message.role as ChatCompletionMessageRole,
            content: choice.message.content,
            tool_calls: choice.message.tool_calls?.map((toolCall) => ({
              id: toolCall.id,
              type: toolCall.type as 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            })),
          },
          index: choice.index ?? index,
          logprobs: null,
          finish_reason: choice.finish_reason as ChatCompletionFinishReason,
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };

      return responseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.TOGETHER_AI,
    );
  };

export const togetherAIChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    let parsedChunk: TogetherAIChatCompletionStreamChunk;
    try {
      parsedChunk = JSON.parse(chunk);
    } catch (error) {
      console.warn('Failed to parse Together AI stream chunk:', error);
      return `data: ${JSON.stringify({
        id: 'error-chunk',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'unknown',
        provider: AIProvider.TOGETHER_AI,
        choices: [
          {
            delta: { content: '' },
            index: 0,
            finish_reason: null,
          },
        ],
      })}\n\n`;
    }

    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: Math.floor(Date.now() / 1000),
      model: parsedChunk.model,
      provider: AIProvider.TOGETHER_AI,
      choices: [
        {
          delta: {
            content: parsedChunk.choices?.[0]?.delta?.content || '',
            role: parsedChunk.choices?.[0]?.delta?.role,
          },
          index: parsedChunk.choices?.[0]?.index || 0,
          finish_reason: parsedChunk.choices?.[0]?.finish_reason || null,
        },
      ],
      ...(parsedChunk.usage && { usage: parsedChunk.usage }),
    })}\n\n`;
  };
