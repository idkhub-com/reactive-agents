import { generateErrorResponse } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';

// Define the interface here instead of importing from server
export interface recraftAIImageObject {
  b64_json?: string;
  url?: string;
}

export const recraftAIImageGenerateConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  style: {
    param: 'style',
    default: 'realistic_image',
  },
  style_id: {
    param: 'style_id',
  },
  n: {
    param: 'n',
    default: 1,
    min: 1,
    max: 2,
  },
  size: {
    param: 'size',
    default: '1024x1024',
  },
  response_format: {
    param: 'response_format',
    default: 'url',
  },
  controls: {
    param: 'controls',
  },
  model: {
    param: 'model',
  },
  artistic_level: {
    param: 'artistic_level',
  },
  substyle: {
    param: 'substyle',
  },
};

export const recraftAIImageGenerateResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200 || 'error' in aiProviderResponseBody) {
      const errorResponse = aiProviderResponseBody as ErrorResponseBody;
      return generateErrorResponse(
        {
          message: errorResponse.error?.message || 'Unknown error occurred',
          type: errorResponse.error?.type || undefined,
          param: errorResponse.error?.param || undefined,
          code: errorResponse.error?.code || undefined,
        },
        AIProvider.RECRFT_AI,
      );
    }
    return aiProviderResponseBody as GenerateImageResponseBody;
  };
