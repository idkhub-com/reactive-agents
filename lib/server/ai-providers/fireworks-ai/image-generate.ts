import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';

import type { GenerateImageRequestBody } from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';
import { fireworksAIErrorResponseTransform } from './chat-complete';

export const FireworksAIImageGenerateConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'text_prompts',
    required: true,
    transform: (idkRequestBody: GenerateImageRequestBody) => {
      return [
        {
          text: idkRequestBody.prompt,
          weight: 1,
        },
      ];
    },
  },
  model: {
    param: 'model',
    required: true,
    default: 'stable-diffusion-xl-1024-v1-0',
  },
  size: [
    {
      param: 'height',
      transform: (idkRequestBody: GenerateImageRequestBody): number =>
        parseInt(idkRequestBody.size?.toLowerCase().split('x')[1] ?? '1024'),
      min: 512,
      max: 1024,
      default: 1024,
    },
    {
      param: 'width',
      transform: (idkRequestBody: GenerateImageRequestBody): number =>
        parseInt(idkRequestBody.size?.toLowerCase().split('x')[0] ?? '1024'),
      min: 512,
      max: 1024,
      default: 1024,
    },
  ],
  cfg_scale: {
    param: 'cfg_scale',
    default: 7,
  },
  sampler: {
    param: 'sampler',
  },
  n: {
    param: 'samples',
    min: 1,
    max: 10,
    default: 1,
  },
  seed: {
    param: 'seed',
    min: 0,
    max: 4294967295,
  },
  steps: {
    param: 'steps',
    min: 10,
    max: 150,
    default: 50,
  },
  safety_check: {
    param: 'safety_check',
  },
  lora_adapter_name: {
    param: 'lora_adapter_name',
  },
  lora_weight_filename: {
    param: 'lora_weight_filename',
  },
};

export const FireworksAIImageGenerateResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      return fireworksAIErrorResponseTransform(aiProviderResponseBody);
    }
    if (Array.isArray(aiProviderResponseBody)) {
      return {
        created: Math.floor(Date.now() / 1000), // Corrected method call
        data: aiProviderResponseBody?.map((r) => ({
          b64_json: r.base64,
          seed: r.seed,
          finishReason: r.finishReason,
        })), // Corrected object creation within map
        provider: AIProvider.FIREWORKS_AI,
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.FIREWORKS_AI,
    );
  };
