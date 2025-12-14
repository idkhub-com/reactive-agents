import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import segmindAPIConfig from './api';
import {
  segmindImageGenerateConfig,
  segmindImageGenerateResponseTransform,
} from './imageGenerate';

const segmindConfig: AIProviderConfig = {
  api: segmindAPIConfig,
  [FunctionName.GENERATE_IMAGE]: segmindImageGenerateConfig,
  responseTransforms: {
    [FunctionName.GENERATE_IMAGE]: segmindImageGenerateResponseTransform,
  },
};

export default segmindConfig;
