import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';

import { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import type { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

export const azureAIInferenceEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: false,
  },
  input: {
    param: 'input',
    required: true,
  },
  user: {
    param: 'user',
  },
};

export const azureAIInferenceEmbedResponseTransform = (
  provider: AIProvider,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return openAIErrorResponseTransform(aiProviderResponseBody, provider);
    }

    const createEmbeddingsResponseBody = CreateEmbeddingsResponseBody.parse(
      aiProviderResponseBody,
    );
    return createEmbeddingsResponseBody;
  };

  return transformer;
};
