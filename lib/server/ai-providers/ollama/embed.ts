import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';
import type { OllamaEmbedResponse } from './types';
import { ollamaErrorResponseTransform } from './utils';

export const ollamaEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'llama3.2:latest',
  },
  input: {
    param: 'prompt',
    required: true,
  },
};

export const ollamaEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return ollamaErrorResponseTransform(
      aiProviderResponseBody,
      aiProviderResponseStatus,
    );
  }

  const response = aiProviderResponseBody as unknown as OllamaEmbedResponse;
  const requestBody = idkRequestData.requestBody as { model?: string };
  const model = response.model || requestBody.model || '';

  if (
    response &&
    typeof response === 'object' &&
    'embedding' in response &&
    Array.isArray(response.embedding)
  ) {
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
        prompt_tokens: response.prompt_eval_count ?? 0,
        total_tokens:
          (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
      },
    };
  }

  return generateInvalidProviderResponseError(
    response as unknown as Record<string, unknown>,
    AIProvider.OLLAMA,
  );
};
