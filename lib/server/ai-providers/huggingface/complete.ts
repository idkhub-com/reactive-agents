import { huggingfaceErrorResponseTransform } from '@server/ai-providers/huggingface/utils';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';

// interface HuggingfaceCompleteResponse extends CompletionResponse {}

export const HuggingfaceCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
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

export const huggingfaceCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if ('error' in aiProviderResponseBody && aiProviderResponseStatus !== 200) {
    return huggingfaceErrorResponseTransform(
      aiProviderResponseBody,
      aiProviderResponseStatus,
    );
  }

  if ('choices' in aiProviderResponseBody) {
    const responseBody = {
      ...aiProviderResponseBody,
    } as unknown as CompletionResponseBody;
    return responseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as unknown as Record<string, unknown>,
    AIProvider.HUGGINGFACE,
  );
};

export const huggingfaceCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    if (chunk.startsWith('event: ping')) {
      return '';
    }

    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return 'data: [DONE]\n\n';
    }
    const parsedChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      ...parsedChunk,
      id: `portkey-${crypto.randomUUID()}`,
      provider: AIProvider.HUGGINGFACE,
    })}\n\n`;
  };
