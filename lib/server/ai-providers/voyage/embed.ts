import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';

export const voyageEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
  },
  input: {
    param: 'input',
    required: true,
  },
  input_type: {
    param: 'input_type',
    required: false,
  },
  truncation: {
    param: 'truncation',
    required: false,
    default: true,
  },
  encoding_format: {
    param: 'encoding_format',
    required: false,
  },
  output_dimension: {
    param: 'output_dimension',
    required: false,
  },
  output_dtype: {
    param: 'output_dtype',
    required: false,
    default: 'float',
  },
};

interface VoyageEmbedResponse {
  object: 'list';
  data: Array<{ object: 'embedding'; embedding: number[]; index: number }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

interface VoyageErrorResponse {
  detail: string;
}

export const voyageErrorResponseTransform = (
  response: VoyageErrorResponse | Record<string, unknown>,
): ErrorResponseBody => {
  if ('detail' in response) {
    return generateErrorResponse(
      {
        message: response.detail as string,
        type: 'Invalid Request',
        param: undefined,
        code: undefined,
      },
      AIProvider.VOYAGE,
    );
  }

  return generateInvalidProviderResponseError(
    response as Record<string, unknown>,
    AIProvider.VOYAGE,
  );
};

export const voyageEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    return voyageErrorResponseTransform(
      aiProviderResponseBody as unknown as VoyageErrorResponse,
    );
  }

  if ('data' in aiProviderResponseBody) {
    const response = aiProviderResponseBody as unknown as VoyageEmbedResponse;
    return {
      object: 'list',
      data: response.data,
      model: response.model,
      usage: {
        prompt_tokens: response.usage.total_tokens,
        total_tokens: response.usage.total_tokens,
      },
      provider: AIProvider.VOYAGE,
    } as CreateEmbeddingsResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as Record<string, unknown>,
    AIProvider.VOYAGE,
  );
};
