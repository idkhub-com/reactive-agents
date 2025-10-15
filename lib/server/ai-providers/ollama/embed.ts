import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';
import type { OllamaEmbedResponse } from './types';
import { ollamaErrorResponseTransform } from './utils';

export const OllamaEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
  },
  input: {
    param: 'prompt',
    required: true,
  },
};

export const OllamaEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if ('error' in aiProviderResponseBody) {
    return ollamaErrorResponseTransform(
      aiProviderResponseBody,
      aiProviderResponseStatus,
    );
  }

  const response = aiProviderResponseBody as unknown as OllamaEmbedResponse;
  const requestBody = idkRequestData.requestBody as { model?: string };
  const model = response.model || requestBody.model || '';

  if ('embedding' in response) {
    return {
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: response.embedding,
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

  return generateInvalidProviderResponseError(response, AIProvider.OLLAMA);
};
