import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { CompletionResponseBody } from '@shared/types/api/routes/completions-api';

import { AIProvider } from '@shared/types/constants';
import { fireworksAIErrorResponseTransform } from './chat-complete';

export const FireworksAICompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
  },
  prompt: {
    param: 'prompt',
    required: true,
  },
  max_tokens: {
    param: 'max_tokens',
    default: 16,
    min: 0,
  },
  logprobs: {
    param: 'logprobs',
    min: 0,
    max: 5,
  },
  echo: {
    param: 'echo',
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
};

export const FireworksAICompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    return fireworksAIErrorResponseTransform(aiProviderResponseBody);
  }

  if ('choices' in aiProviderResponseBody) {
    const completeResponseBody = CompletionResponseBody.parse(
      aiProviderResponseBody,
    );
    return completeResponseBody;
  }
  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.FIREWORKS_AI,
  );
};

export interface FireworksAICompleteStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    text: string;
    index: number;
    finish_reason: string | null;
    logprobs: null;
  }[];
  usage: null | {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const FireworksAICompleteStreamChunkTransform: (
  response: string,
) => string = (responseChunk) => {
  let chunk = responseChunk.trim();
  chunk = chunk.replace(/^data: /, '');
  chunk = chunk.trim();
  if (chunk === '[DONE]') {
    return `data: ${chunk}\n\n`;
  }
  const parsedChunk: FireworksAICompleteStreamChunk = JSON.parse(chunk);
  return `data: ${JSON.stringify({
    id: parsedChunk.id,
    object: parsedChunk.object,
    created: parsedChunk.created,
    model: parsedChunk.model,
    provider: AIProvider.FIREWORKS_AI,
    choices: [
      {
        index: parsedChunk.choices[0].index ?? 0,
        text: parsedChunk.choices[0].text,
        logprobs: null,
        finish_reason: parsedChunk.choices[0].finish_reason,
      },
    ],
    ...(parsedChunk.usage ? { usage: parsedChunk.usage } : {}),
  })}\n\n`;
};
