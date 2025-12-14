import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';
import type { MistralAIEmbedResponse } from './types';
import { mistralAIErrorResponseTransform } from './utils';

export const mistralAIEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'mistral-embed',
  },
  input: {
    param: 'input',
    required: true,
  },
};

export const mistralAIEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  raRequestData,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return mistralAIErrorResponseTransform(
      aiProviderResponseBody,
      aiProviderResponseStatus,
    );
  }

  const response = aiProviderResponseBody as unknown as MistralAIEmbedResponse;
  const requestBody = raRequestData.requestBody as { model?: string };
  const model = response.model || requestBody.model || '';

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray(response.data)
  ) {
    return {
      object: response.object,
      data: response.data.map((d) => ({
        object: d.object,
        embedding: d.embedding,
        index: d.index,
      })),
      model,
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
      },
    };
  }

  return generateInvalidProviderResponseError(
    response as unknown as Record<string, unknown>,
    AIProvider.MISTRAL_AI,
  );
};
