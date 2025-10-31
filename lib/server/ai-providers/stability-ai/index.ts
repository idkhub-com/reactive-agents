import type {
  AIProviderConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { GenerateImageRequestBody } from '@shared/types/api/routes/images-api';
import StabilityAIAPIConfig from './api';
import {
  StabilityAIImageGenerateV1Config,
  StabilityAIImageGenerateV1ResponseTransform,
} from './image-generate';
import {
  StabilityAIImageGenerateV2Config,
  StabilityAIImageGenerateV2ResponseTransform,
} from './image-generate-v2';
import { isStabilityV1Model } from './utils';

const StabilityAIConfig: AIProviderConfig = {
  api: StabilityAIAPIConfig,
  getConfig: (raRequestBody): AIProviderConfig => {
    const generateImageRequestBody = raRequestBody as GenerateImageRequestBody;
    const model = generateImageRequestBody?.model;
    if (typeof model === 'string' && isStabilityV1Model(model)) {
      return {
        api: StabilityAIAPIConfig,
        [FunctionName.GENERATE_IMAGE]: StabilityAIImageGenerateV1Config,
        responseTransforms: {
          [FunctionName.GENERATE_IMAGE]:
            StabilityAIImageGenerateV1ResponseTransform as unknown as ResponseTransformFunction,
        },
      };
    }
    const config: AIProviderConfig = {
      api: StabilityAIAPIConfig,
      [FunctionName.GENERATE_IMAGE]: StabilityAIImageGenerateV2Config,
      responseTransforms: {
        [FunctionName.GENERATE_IMAGE]:
          StabilityAIImageGenerateV2ResponseTransform as unknown as ResponseTransformFunction,
      },
    };
    return config;
  },
};

export default StabilityAIConfig;
