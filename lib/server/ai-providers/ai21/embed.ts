import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateEmbeddingsRequestBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';
import { aI21ErrorResponseTransform } from './chat-complete';

export const aI21EmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'texts',
    required: true,
    transform: (idkRequestBody: CreateEmbeddingsRequestBody): string => {
      if ('input' in idkRequestBody) {
        return Array.isArray(idkRequestBody.input)
          ? idkRequestBody.input.join(' ')
          : idkRequestBody.input || '';
      }
      throw new Error('Invalid params type for embedding');
    },
  },
  type: {
    param: 'type',
    required: true,
    transform: (idkRequestBody: CreateEmbeddingsRequestBody): string => {
      if ('input' in idkRequestBody) {
        return 'embed';
      }
      throw new Error('Invalid params type for embedding');
    },
  },
};

export const aI21EmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = aI21ErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) return errorResponse;
  }
  if ('results' in aiProviderResponseBody) {
    const results = aiProviderResponseBody.results as {
      embedding: number[];
    }[];
    return {
      object: 'list',
      data: results.map((result, index) => ({
        object: 'embedding',
        embedding: result.embedding,
        index: index,
      })),
      model: '',
      provider: AIProvider.AI21,
      usage: {
        prompt_tokens: -1,
        total_tokens: -1,
      },
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.AI21,
  );
};
