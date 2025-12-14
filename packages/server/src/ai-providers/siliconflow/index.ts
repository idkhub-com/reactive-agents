import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import siliconFlowAPIConfig from './api';
import {
  siliconFlowChatCompleteConfig,
  siliconFlowChatCompleteResponseTransform,
  siliconFlowChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  siliconFlowEmbedConfig,
  siliconFlowEmbedResponseTransform,
} from './embed';
import {
  siliconFlowImageGenerateConfig,
  siliconFlowImageGenerateResponseTransform,
} from './image-generate';

export const siliconFlowConfig: AIProviderConfig = {
  api: siliconFlowAPIConfig,
  [FunctionName.CHAT_COMPLETE]: siliconFlowChatCompleteConfig,
  [FunctionName.EMBED]: siliconFlowEmbedConfig,
  [FunctionName.GENERATE_IMAGE]: siliconFlowImageGenerateConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: siliconFlowChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      siliconFlowChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: siliconFlowEmbedResponseTransform,
    [FunctionName.GENERATE_IMAGE]: siliconFlowImageGenerateResponseTransform,
  },
};
