import type {
  GoogleErrorResponse,
  GoogleImageGenInstanceData,
  GoogleImageGenResponse,
} from '@server/ai-providers/google/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';

import { GoogleErrorResponseTransform } from './utils';

const transformParams = (
  params: Record<string, unknown>,
): Record<string, unknown> => {
  const config: Record<string, unknown> = {};
  if (params.n) {
    config.sampleCount = params.n;
  }
  if (params.quality) {
    let quality: number;
    if (typeof params.quality === 'number') {
      quality = params.quality;
    } else {
      if (params.quality === 'hd') {
        quality = 100;
      } else {
        quality = 75;
      }
    }
    if (config.outputOptions) {
      (
        config.outputOptions as unknown as Record<string, unknown>
      ).compressionQuality = quality;
    } else {
      config.outputOptions = { compressionQuality: quality };
    }
  }
  if (params.style) {
    config.sampleImageStyle = params.style;
  }

  if (params.aspectRatio) {
    config.aspectRatio = params.aspectRatio;
  }
  if (params.seed) {
    config.seed = params.seed;
  }
  if (params.negativePrompt) {
    config.negativePrompt = params.negativePrompt;
  }
  if (params.personGeneration) {
    config.personGeneration = params.personGeneration;
  }
  if (params.safetySetting) {
    config.safetySetting = params.safetySetting;
  }
  if (params.addWatermark) {
    config.addWatermark = params.addWatermark;
  }
  if (params.mimeType) {
    if (config.outputOptions) {
      (config.outputOptions as unknown as Record<string, unknown>).mimeType =
        params.mimeType;
    } else {
      config.outputOptions = { mimeType: params.mimeType };
    }
  }

  return config;
};

export const googleImageGenConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'instances',
    required: true,
    transform: (params: Record<string, unknown>) => {
      const instances: GoogleImageGenInstanceData[] = [];
      if (Array.isArray(params.prompt)) {
        params.prompt.forEach((text: string) => {
          instances.push({
            prompt: text,
          });
        });
      } else {
        instances.push({
          prompt: params.prompt as string,
        });
      }
      return instances as unknown as Record<string, unknown>[];
    },
  },
  n: {
    param: 'parameters',
    min: 1,
    max: 8,
    transform: transformParams,
  },
  quality: {
    param: 'parameters',
    transform: transformParams,
  },
  style: {
    param: 'parameters',
    transform: transformParams,
  },
  aspectRatio: {
    param: 'parameters',
    transform: transformParams,
  },
  seed: {
    param: 'parameters',
    transform: transformParams,
  },
  negativePrompt: {
    param: 'parameters',
    transform: transformParams,
  },
  personGeneration: {
    param: 'parameters',
    transform: transformParams,
  },
  safetySetting: {
    param: 'parameters',
    transform: transformParams,
  },
  addWatermark: {
    param: 'parameters',
    transform: transformParams,
  },
  mimeType: {
    param: 'parameters',
    transform: transformParams,
  },
};

export const vertexGoogleImageGenResponseTransform: ResponseTransformFunction =
  (response, responseStatus) => {
    const googleResponse = response as unknown as
      | GoogleImageGenResponse
      | GoogleErrorResponse;
    if (responseStatus !== 200) {
      const errorResposne = GoogleErrorResponseTransform(
        googleResponse as unknown as GoogleErrorResponse,
      );
      if (errorResposne) return errorResposne;
    }

    if ('predictions' in googleResponse) {
      return {
        created: Math.floor(Date.now() / 1000),
        data: googleResponse.predictions.map((generation) => ({
          b64_json: generation.bytesBase64Encoded,
        })),
        provider: AIProvider.GOOGLE_VERTEX_AI,
      };
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.GOOGLE_VERTEX_AI,
    );
  };
