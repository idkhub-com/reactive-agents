import type { AnyscaleEmbedResponse } from '@server/ai-providers/anyscale/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';

import { anyscaleErrorResponseTransform } from './chat-complete';

export const anyscaleEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'thenlper/gte-large',
  },
  input: {
    param: 'input',
    default: '',
  },
  user: {
    param: 'user',
  },
};

export const anyscaleEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = anyscaleErrorResponseTransform(
      aiProviderResponseBody,
    );
    if (errorResponse) return errorResponse;
  }

  if ('data' in aiProviderResponseBody) {
    const createEmbeddingsResponseBody =
      aiProviderResponseBody as AnyscaleEmbedResponse;
    return {
      object: createEmbeddingsResponseBody.object,
      data: createEmbeddingsResponseBody.data,
      model: createEmbeddingsResponseBody.model,
      usage: createEmbeddingsResponseBody.usage,
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.ANYSCALE,
  );
};
