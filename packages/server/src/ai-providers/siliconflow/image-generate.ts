import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api/response';
import { AIProvider } from '@shared/types/constants';

export const siliconFlowImageGenerateConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  model: {
    param: 'model',
    required: true,
    default: 'Kwai-Kolors/Kolors',
  },
  n: {
    param: 'batch_size',
    default: 1,
    min: 1,
    max: 4,
  },
  size: {
    param: 'image_size',
    default: '1024x1024',
  },
  num_inference_steps: {
    param: 'num_inference_steps',
    default: 50,
  },
  negative_prompt: {
    param: 'negative_prompt',
  },
  seed: {
    param: 'seed',
  },
  quality: {
    param: 'quality',
  },
  response_format: {
    param: 'response_format',
    default: 'b64_json',
  },
  style: {
    param: 'style',
  },
  user: {
    param: 'user',
  },
};

interface SiliconFlowImageResponse {
  images: string[];
  timings?: {
    inference: number;
  };
  seed?: number;
  nsfw_content_detected?: boolean;
}

export const siliconFlowImageGenerateResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      if ('message' in aiProviderResponseBody) {
        return generateErrorResponse(
          {
            message: aiProviderResponseBody.message as string,
            type: (aiProviderResponseBody.type as string) || 'api_error',
            param: aiProviderResponseBody.param as string | undefined,
            code: (aiProviderResponseBody.code as string) || undefined,
          },
          AIProvider.SILICONFLOW,
        );
      }

      return generateErrorResponse(
        {
          message: 'Image generation failed',
          type: 'api_error',
          param: undefined,
          code: undefined,
        },
        AIProvider.SILICONFLOW,
      );
    }

    if ('images' in aiProviderResponseBody) {
      const siliconFlowResponse =
        aiProviderResponseBody as unknown as SiliconFlowImageResponse;

      const responseBody: GenerateImageResponseBody = {
        created: Math.floor(Date.now() / 1000),
        data: siliconFlowResponse.images.map((imageBase64) => ({
          b64_json: imageBase64,
          url: undefined,
          revised_prompt: undefined,
        })),
      };

      Object.defineProperty(responseBody, 'provider', {
        value: AIProvider.SILICONFLOW,
        enumerable: true,
      });

      return responseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.SILICONFLOW,
    );
  };
