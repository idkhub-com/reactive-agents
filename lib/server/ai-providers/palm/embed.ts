import { googleErrorResponseTransform } from '@server/ai-providers/google/chat-complete';

import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateEmbeddingsRequestBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';

export const palmEmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'text',
    required: true,
  },
  model: {
    param: 'model',
    default: 'models/embedding-gecko-001',
  },
};

export const palmEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = googleErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.PALM,
    );
    if (errorResponse) return errorResponse;
  }

  const createEmbeddingsRequestBody =
    idkRequestData.requestBody as CreateEmbeddingsRequestBody;
  const model = (createEmbeddingsRequestBody.model as string) || '';
  if ('embedding' in aiProviderResponseBody) {
    const embedding = aiProviderResponseBody.embedding as {
      value: number[];
    };
    return {
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: embedding.value,
          index: 0,
        },
      ],
      model,
      usage: {
        prompt_tokens: -1,
        total_tokens: -1,
      },
      provider: AIProvider.PALM,
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.PALM,
  );
};
