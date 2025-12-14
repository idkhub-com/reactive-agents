import type {
  AnyscaleCompleteResponse,
  AnyscaleCompleteStreamChunk,
} from '@server/ai-providers/anyscale/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';
import { anyscaleErrorResponseTransform } from './chat-complete';

export const anyscaleCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'Meta-Llama/Llama-Guard-7b',
  },
  prompt: {
    param: 'prompt',
    default: '',
  },
  max_tokens: {
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
  logprobs: {
    param: 'logprobs',
    max: 5,
  },
  echo: {
    param: 'echo',
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
  best_of: {
    param: 'best_of',
  },
  logit_bias: {
    param: 'logit_bias',
  },
  user: {
    param: 'user',
  },
};

export const anyscaleCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = anyscaleErrorResponseTransform(
      aiProviderResponseBody,
    );
    if (errorResponse) return errorResponse;
  }

  if ('choices' in aiProviderResponseBody) {
    const completionResponseBody =
      aiProviderResponseBody as AnyscaleCompleteResponse;
    return {
      id: completionResponseBody.id,
      object: completionResponseBody.object,
      created: completionResponseBody.created,
      model: completionResponseBody.model,
      provider: AIProvider.ANYSCALE,
      choices: completionResponseBody.choices,
      usage: completionResponseBody.usage,
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.ANYSCALE,
  );
};

export const anyscaleCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }
    const parsedChunk: AnyscaleCompleteStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.ANYSCALE,
      choices: parsedChunk.choices,
    })}\n\n`;
  };
