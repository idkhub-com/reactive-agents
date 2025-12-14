import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import recraftAIAPIConfig from './api';
import {
  recraftAIImageGenerateConfig,
  recraftAIImageGenerateResponseTransform,
} from './image-generate';

const recraftAIConfig: AIProviderConfig = {
  api: recraftAIAPIConfig,
  [FunctionName.GENERATE_IMAGE]: recraftAIImageGenerateConfig,
  responseTransforms: {
    [FunctionName.GENERATE_IMAGE]: recraftAIImageGenerateResponseTransform,
  },
};

export default recraftAIConfig;
