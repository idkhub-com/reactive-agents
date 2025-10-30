import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  CreateEmbeddingsRequestBody,
  CreateEmbeddingsResponseBody,
} from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';
import { fireworksAIErrorResponseTransform } from './chat-complete';

export const FireworksAIEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'nomic-ai/nomic-embed-text-v1.5',
  },
  input: {
    param: 'input',
    required: true,
    transform: (raRequestBody: CreateEmbeddingsRequestBody): string => {
      if ('input' in raRequestBody) {
        if (Array.isArray(raRequestBody.input)) {
          return raRequestBody.input.join('\n');
        }
        return raRequestBody.input as string;
      }
      return '';
    },
  },
  dimensions: {
    param: 'dimensions',
  },
};

export const FireworksAIEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if ('fault' in aiProviderResponseBody && aiProviderResponseStatus !== 200) {
    return fireworksAIErrorResponseTransform(aiProviderResponseBody);
  }

  if ('data' in aiProviderResponseBody) {
    const createEmbeddingsResponseBody =
      aiProviderResponseBody as CreateEmbeddingsResponseBody;
    return {
      object: createEmbeddingsResponseBody.object,
      data: createEmbeddingsResponseBody.data.map((d) => ({
        object: d.object,
        embedding: d.embedding,
        index: d.index,
      })),
      model: createEmbeddingsResponseBody.model,
      usage: {
        prompt_tokens: createEmbeddingsResponseBody.usage.prompt_tokens,
        total_tokens: createEmbeddingsResponseBody.usage.total_tokens,
      },
      provider: AIProvider.FIREWORKS_AI,
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.FIREWORKS_AI,
  );
};
