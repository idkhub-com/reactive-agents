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
import { workersAIErrorResponseTransform } from './utils';

export const workersAIEmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'text',
    required: true,
    transform: (raRequestBody: CreateEmbeddingsRequestBody): string[] => {
      if (Array.isArray(raRequestBody.input)) {
        return raRequestBody.input as string[];
      } else {
        return [raRequestBody.input];
      }
    },
  },
  model: {
    param: 'model',
    required: true,
  },
};

interface WorkersAIEmbedResponse {
  result: {
    shape: number[];
    data: number[][];
  };
  success: boolean;
  errors: string[];
  messages: string[];
  model: string;
}

export const workersAIEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  _raRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    return workersAIErrorResponseTransform(aiProviderResponseBody);
  }

  if ('result' in aiProviderResponseBody) {
    const response =
      aiProviderResponseBody as unknown as WorkersAIEmbedResponse;
    return {
      object: 'list',
      data: response.result.data.map((embedding, index) => ({
        object: 'embedding',
        embedding: embedding,
        index: index,
      })),
      model: response.model,
      usage: {
        prompt_tokens: -1,
        total_tokens: -1,
      },
      provider: AIProvider.WORKERS_AI,
    } as CreateEmbeddingsResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as Record<string, unknown>,
    AIProvider.WORKERS_AI,
  );
};
