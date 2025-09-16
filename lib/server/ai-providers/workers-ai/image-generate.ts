import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  GenerateImageRequestBody,
  GenerateImageResponseBody,
} from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';
import { workersAIErrorResponseTransform } from './utils';

export const workersAIImageGenerateConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  model: {
    param: 'model',
    required: true,
  },
  negative_prompt: {
    param: 'negative_prompt',
  },
  steps: [
    {
      param: 'num_steps',
    },
    {
      param: 'steps',
    },
  ],
  size: [
    {
      param: 'height',
      transform: (idkRequestBody: GenerateImageRequestBody): number => {
        // Validate that params.size is a string and contains 'x'
        if (
          !idkRequestBody.size ||
          typeof idkRequestBody.size !== 'string' ||
          !idkRequestBody.size.includes('x')
        ) {
          throw new Error(
            `Invalid size parameter: ${idkRequestBody.size}. Expected format: "widthxheight" (e.g., "1024x1024")`,
          );
        }

        const parts = idkRequestBody.size.toLowerCase().split('x');
        if (parts.length !== 2) {
          throw new Error(
            `Invalid size format: ${idkRequestBody.size}. Expected format: "widthxheight" (e.g., "1024x1024")`,
          );
        }

        const height = parseInt(parts[1], 10);
        if (Number.isNaN(height) || height <= 0) {
          throw new Error(
            `Invalid height value in size parameter: ${idkRequestBody.size}`,
          );
        }

        return height;
      },
    },
    {
      param: 'width',
      transform: (idkRequestBody: GenerateImageRequestBody): number => {
        // Validate that params.size is a string and contains 'x'
        if (
          !idkRequestBody.size ||
          typeof idkRequestBody.size !== 'string' ||
          !idkRequestBody.size.includes('x')
        ) {
          throw new Error(
            `Invalid size parameter: ${idkRequestBody.size}. Expected format: "widthxheight" (e.g., "1024x1024")`,
          );
        }

        const parts = idkRequestBody.size.toLowerCase().split('x');
        if (parts.length !== 2) {
          throw new Error(
            `Invalid size format: ${idkRequestBody.size}. Expected format: "widthxheight" (e.g., "1024x1024")`,
          );
        }

        const width = parseInt(parts[0], 10);
        if (Number.isNaN(width) || width <= 0) {
          throw new Error(
            `Invalid width value in size parameter: ${idkRequestBody.size}`,
          );
        }

        return width;
      },
    },
  ],
  seed: {
    param: 'seed',
  },
  guidance_scale: {
    param: 'guidance_scale',
  },
  num_inference_steps: {
    param: 'num_inference_steps',
  },
};

interface WorkersAIImageGenerateResponse {
  result: {
    image?: string;
  };
  success: boolean;
  errors: string[];
  messages: string[];
}

export const workersAIImageGenerateResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      return workersAIErrorResponseTransform(aiProviderResponseBody);
    }

    // Workers AI image response structure varies by model
    // We currently only support models that return a base64 image
    if (
      'result' in aiProviderResponseBody &&
      'image' in (aiProviderResponseBody.result as Record<string, unknown>)
    ) {
      const response =
        aiProviderResponseBody as unknown as WorkersAIImageGenerateResponse;
      return {
        created: Math.floor(Date.now() / 1000),
        data: [
          {
            b64_json: response.result.image,
          },
        ],
        provider: AIProvider.WORKERS_AI,
      } as GenerateImageResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.WORKERS_AI,
    );
  };
