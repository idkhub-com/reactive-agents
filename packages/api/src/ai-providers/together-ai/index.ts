import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import togetherAIAPIConfig from './api';
import {
  togetherAIChatCompleteConfig,
  togetherAIChatCompleteResponseTransform,
  togetherAIChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  togetherAICompleteConfig,
  togetherAICompleteResponseTransform,
  togetherAICompleteStreamChunkTransform,
} from './complete';
import {
  togetherAIEmbedConfig,
  togetherAIEmbedResponseTransform,
} from './embed';

const togetherAIConfig: AIProviderConfig = {
  api: togetherAIAPIConfig,
  [FunctionName.COMPLETE]: togetherAICompleteConfig,
  [FunctionName.CHAT_COMPLETE]: togetherAIChatCompleteConfig,
  [FunctionName.EMBED]: togetherAIEmbedConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: togetherAICompleteResponseTransform,
    [FunctionName.STREAM_COMPLETE]: togetherAICompleteStreamChunkTransform,
    [FunctionName.CHAT_COMPLETE]: togetherAIChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      togetherAIChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: togetherAIEmbedResponseTransform,
  },
};

export default togetherAIConfig;
