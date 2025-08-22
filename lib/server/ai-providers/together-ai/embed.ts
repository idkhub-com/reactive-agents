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
import { togetherAIErrorResponseTransform } from './chat-complete';

export const togetherAIEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'mistral-embed',
  },
  input: {
    param: 'input',
    required: true,
    transform: (idkRequestBody: CreateEmbeddingsRequestBody): string[] => {
      if ('input' in idkRequestBody) {
        if (Array.isArray(idkRequestBody.input)) {
          return idkRequestBody.input as string[];
        }
        return [idkRequestBody.input as string];
      }
      throw new Error('Invalid input for embedding');
    },
  },
  user: {
    param: 'user',
  },
  encoding_format: {
    param: 'encoding_format',
  },
  dimensions: {
    param: 'dimensions',
  },
};

export interface TogetherAIEmbedResponse {
  object: string;
  data: {
    object: string;
    embedding: number[];
    index: number;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export const togetherAIEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = togetherAIErrorResponseTransform(
      aiProviderResponseBody,
    );
    if (errorResponse) return errorResponse;
  }

  if ('data' in aiProviderResponseBody) {
    const response =
      aiProviderResponseBody as unknown as TogetherAIEmbedResponse;
    const _requestBody =
      idkRequestData.requestBody as unknown as CreateEmbeddingsRequestBody;

    const responseBody: CreateEmbeddingsResponseBody = {
      object: response.object as 'list',
      data: response.data.map((d) => ({
        object: d.object as 'embedding',
        embedding: d.embedding,
        index: d.index,
      })),
      model: response.model,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };

    return responseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.TOGETHER_AI,
  );
};
