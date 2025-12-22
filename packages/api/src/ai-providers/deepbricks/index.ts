import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { deepbricksAPIConfig } from './api';
import {
  deepbricksChatCompleteConfig,
  deepbricksChatCompleteResponseTransform,
} from './chat-complete';
import {
  deepbricksImageGenerateConfig,
  deepbricksImageGenerateResponseTransform,
} from './image-generate';

export const deepbricksConfig: AIProviderConfig = {
  api: deepbricksAPIConfig,
  [FunctionName.CHAT_COMPLETE]: deepbricksChatCompleteConfig,
  [FunctionName.GENERATE_IMAGE]: deepbricksImageGenerateConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: deepbricksChatCompleteResponseTransform,
    [FunctionName.GENERATE_IMAGE]: deepbricksImageGenerateResponseTransform,
  },
};
