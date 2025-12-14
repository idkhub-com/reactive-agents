import { googleErrorResponseTransform } from '@server/ai-providers/google/chat-complete';
import type {
  GoogleEmbedParams,
  GoogleEmbedResponse,
  GoogleResponseCandidateContent,
} from '@server/ai-providers/google/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsRequestBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';

export const googleEmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'content',
    required: true,
    transform: (
      params: CompletionRequestBody | GoogleEmbedParams,
    ): GoogleResponseCandidateContent => {
      const googleParams = params as GoogleEmbedParams;

      const parts = [];
      if (Array.isArray(googleParams.input)) {
        googleParams.input.forEach((i) => {
          parts.push({
            text: i,
          });
        });
      } else {
        parts.push({
          text: googleParams.input,
        });
      }

      return {
        parts,
      };
    },
  },
  model: {
    param: 'model',
    required: true,
    default: 'embedding-001',
  },
  // Map OpenAI-style 'dimensions' to Google's 'output_dimensionality'
  dimensions: {
    param: 'output_dimensionality',
    required: false,
  },
};

export const googleEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  raRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = googleErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) return errorResponse;
  }

  const createEmbeddingsRequestBody =
    raRequestData.requestBody as CreateEmbeddingsRequestBody;

  const model = (createEmbeddingsRequestBody.model as string) || '';

  if ('embedding' in aiProviderResponseBody) {
    const googleResponse =
      aiProviderResponseBody as unknown as GoogleEmbedResponse;
    return {
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: googleResponse.embedding.values,
          index: 0,
        },
      ],
      model,
      usage: {
        prompt_tokens: -1,
        total_tokens: -1,
      },
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as unknown as Record<string, unknown>,
    AIProvider.GOOGLE,
  );
};
