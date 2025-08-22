import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
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

export const upstageChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'solar-pro',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      if (!idkRequestBody.messages) return [];
      return idkRequestBody.messages?.map((message) => {
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
  frequency_penalty: {
    param: 'frequency_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  stop: {
    param: 'stop',
    default: null,
  },
};

interface UpstageStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    delta: {
      role?: string | null;
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

interface UpstageChatCompleteResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const upstageChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  _idkRequestData,
) => {
  if ('message' in aiProviderResponseBody && aiProviderResponseStatus !== 200) {
    return generateErrorResponse(
      {
        message: aiProviderResponseBody.message as string,
        type: aiProviderResponseBody.type as string,
        param: aiProviderResponseBody.param as string | undefined,
        code: aiProviderResponseBody.code as string,
      },
      AIProvider.UPSTAGE,
    );
  }

  if ('choices' in aiProviderResponseBody) {
    const response =
      aiProviderResponseBody as unknown as UpstageChatCompleteResponse;

    const responseBody = {
      id: response.id,
      object: 'chat.completion' as const,
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role as ChatCompletionMessageRole,
          content: choice.message.content,
        },
        logprobs: null,
        finish_reason: choice.finish_reason as ChatCompletionFinishReason,
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      provider: AIProvider.UPSTAGE,
    } as ChatCompletionResponseBody & { provider: string };

    return responseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.UPSTAGE,
  );
};

export const upstageChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    _fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    _idkRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }
    const parsedChunk: UpstageStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.UPSTAGE,
      choices: [
        {
          index: parsedChunk.choices[0].index,
          delta: {
            role: parsedChunk.choices[0].delta.role,
            content: parsedChunk.choices[0].delta.content,
          },
          logprobs: null,
          finish_reason: parsedChunk.choices[0].finish_reason,
        },
      ],
      usage: parsedChunk.usage,
    })}\n\n`;
  };
