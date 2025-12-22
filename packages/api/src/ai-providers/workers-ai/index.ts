import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { workersAIAPIConfig } from './api';
import {
  workersAIChatCompleteConfig,
  workersAIChatCompleteResponseTransform,
} from './chat-complete';
import {
  workersAICompleteConfig,
  workersAICompleteResponseTransform,
} from './complete';
import { workersAIEmbedConfig, workersAIEmbedResponseTransform } from './embed';
import {
  workersAIImageGenerateConfig,
  workersAIImageGenerateResponseTransform,
} from './image-generate';

export const workersAIConfig: AIProviderConfig = {
  api: workersAIAPIConfig,
  [FunctionName.COMPLETE]: workersAICompleteConfig,
  [FunctionName.CHAT_COMPLETE]: workersAIChatCompleteConfig,
  [FunctionName.EMBED]: workersAIEmbedConfig,
  [FunctionName.GENERATE_IMAGE]: workersAIImageGenerateConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: workersAICompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: workersAIChatCompleteResponseTransform,
    [FunctionName.EMBED]: workersAIEmbedResponseTransform,
    [FunctionName.GENERATE_IMAGE]: workersAIImageGenerateResponseTransform,
  },
};
