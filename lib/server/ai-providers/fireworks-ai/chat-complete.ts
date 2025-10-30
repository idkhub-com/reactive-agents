import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import {
  type ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

export const FireworksAIChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
  },
  messages: {
    param: 'messages',
    required: true,
    default: [],
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return raRequestBody.messages?.map((message: ChatCompletionMessage) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  tools: {
    param: 'tools',
  },
  max_tokens: {
    param: 'max_tokens',
    default: 200,
    min: 1,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 200,
    min: 1,
  },
  prompt_truncate_len: {
    param: 'prompt_truncate_len',
    default: 1500,
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
  top_k: {
    param: 'top_k',
    min: 1,
    max: 128,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    min: -2,
    max: 2,
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
  },
  n: {
    param: 'n',
    default: 1,
    min: 1,
    max: 128,
  },
  stop: {
    param: 'stop',
  },
  response_format: {
    param: 'response_format',
  },
  stream: {
    param: 'stream',
    default: false,
  },
  context_length_exceeded_behavior: {
    param: 'context_length_exceeded_behavior',
  },
  user: {
    param: 'user',
  },
  logprobs: {
    param: 'logprobs',
  },
  top_logprobs: {
    param: 'top_logprobs',
  },
};

export interface FireworksAIStreamChunk {
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
    logprobs: object | null;
  }[];
  usage: null | {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const fireworksAIErrorResponseTransform: (
  aiProviderResponseBody: Record<string, unknown>,
) => ErrorResponseBody = (aiProviderResponseBody) => {
  if ('fault' in aiProviderResponseBody) {
    const fault = aiProviderResponseBody.fault as {
      faultstring: string;
      detail: {
        errorcode: string;
      };
    };
    return generateErrorResponse(
      {
        message: fault.faultstring,
        type: undefined,
        param: undefined,
        code: fault.detail.errorcode,
      },
      AIProvider.FIREWORKS_AI,
    );
  } else if ('detail' in aiProviderResponseBody) {
    return generateErrorResponse(
      {
        message: aiProviderResponseBody.detail as string,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.FIREWORKS_AI,
    );
  }
  return generateErrorResponse(
    aiProviderResponseBody.error as {
      message: string;
      type?: string | undefined;
      param?: string | undefined;
      code?: string | undefined;
    },
    AIProvider.FIREWORKS_AI,
  );
};

export const FireworksAIChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      return fireworksAIErrorResponseTransform(aiProviderResponseBody);
    }

    if ('choices' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }
    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.FIREWORKS_AI,
    );
  };

export const FireworksAIChatCompleteStreamChunkTransform: (
  response: string,
) => string = (responseChunk) => {
  let chunk = responseChunk.trim();
  chunk = chunk.replace(/^data: /, '');
  chunk = chunk.trim();
  if (chunk === '[DONE]') {
    return `data: ${chunk}\n\n`;
  }
  const parsedChunk: FireworksAIStreamChunk = JSON.parse(chunk);
  return `data: ${JSON.stringify({
    id: parsedChunk.id,
    object: parsedChunk.object,
    created: parsedChunk.created,
    model: parsedChunk.model,
    provider: AIProvider.FIREWORKS_AI,
    choices: [
      {
        index: parsedChunk.choices[0].index,
        delta: parsedChunk.choices[0].delta,
        finish_reason: parsedChunk.choices[0].finish_reason,
        logprobs: parsedChunk.choices[0].logprobs,
      },
    ],
    ...(parsedChunk.usage ? { usage: parsedChunk.usage } : {}),
  })}\n\n`;
};
