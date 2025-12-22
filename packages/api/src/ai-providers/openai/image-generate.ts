import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAIImageGenerateConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  model: {
    param: 'model',
    required: true,
    default: 'dall-e-2',
  },
  n: {
    param: 'n',
    min: 1,
    max: 10,
  },
  quality: {
    param: 'quality',
  },
  response_format: {
    param: 'response_format',
  },
  size: {
    param: 'size',
  },
  style: {
    param: 'style',
  },
  user: {
    param: 'user',
  },
};

export const openAIImageGenerateResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as GenerateImageResponseBody;
};
