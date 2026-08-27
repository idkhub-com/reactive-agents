import type {
  GoogleEmbedResponse,
  GoogleErrorResponse,
} from '@api/ai-providers/google/types';

import { generateInvalidProviderResponseError } from '@api/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';

import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type {
  CreateEmbeddingsRequestBody,
  CreateEmbeddingsResponseBody,
  EmbeddingData,
} from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';
import {
  googleTransformEmbeddingInput,
  googleTransformEmbeddingsDimension,
} from './transform-generation-config';
import { GoogleErrorResponseTransform } from './utils';

export const googleEmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'instances',
    required: true,
    transform: (saRequestBody: CreateEmbeddingsRequestBody) =>
      googleTransformEmbeddingInput(saRequestBody) as Record<string, unknown>[],
  },
  parameters: {
    param: 'parameters',
    required: false,
  },
  dimensions: {
    param: 'parameters',
    required: false,
    transform: (saRequestBody: CreateEmbeddingsRequestBody) =>
      googleTransformEmbeddingsDimension(saRequestBody),
  },
};

export const vertexGoogleEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  saRequestData,
) => {
  const googleResponse = aiProviderResponseBody as unknown as
    | GoogleEmbedResponse
    | GoogleErrorResponse;

  if (aiProviderResponseStatus !== 200) {
    const errorResposne = GoogleErrorResponseTransform(
      googleResponse as unknown as GoogleErrorResponse,
    );
    if (errorResposne) return errorResposne;
  }

  if ('predictions' in googleResponse) {
    const data: EmbeddingData[] = [];
    let tokenCount = 0;
    googleResponse.predictions.forEach((prediction, index) => {
      const item = {
        object: 'embedding',
        index: index,
        ...(prediction.imageEmbedding && {
          image_embedding: prediction.imageEmbedding,
        }),
        ...(prediction.videoEmbeddings && {
          video_embeddings: prediction.videoEmbeddings.map(
            (videoEmbedding, idx) => ({
              object: 'embedding',
              embedding: videoEmbedding.embedding,
              index: idx,
              start_offset: videoEmbedding.startOffsetSec,
              end_offset: videoEmbedding.endOffsetSec,
            }),
          ),
        }),
        ...(prediction.textEmbedding && {
          embedding: prediction.textEmbedding,
        }),
        ...(prediction.embeddings && {
          embedding: prediction.embeddings.values,
        }),
      };
      tokenCount += prediction?.embeddings?.statistics?.token_count || 0;
      data.push(item as unknown as EmbeddingData);
    });
    data.forEach((item, index) => {
      item.index = index;
    });
    const embeddingsResponseBody: CreateEmbeddingsResponseBody = {
      model: (saRequestData.requestBody as CreateEmbeddingsRequestBody).model,
      object: 'list',
      data: data,
      usage: {
        prompt_tokens: tokenCount,
        total_tokens: tokenCount,
      },
    };
    return embeddingsResponseBody;
  }

  return generateInvalidProviderResponseError(
    googleResponse as unknown as Record<string, unknown>,
    AIProvider.GOOGLE_VERTEX_AI,
  ) as ErrorResponseBody;
};
