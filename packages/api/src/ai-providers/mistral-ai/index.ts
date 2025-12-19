import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { mistralAIAPIConfig } from './api';
import {
  mistralAIChatCompleteConfig,
  mistralAIChatCompleteResponseTransform,
  mistralAIChatCompleteStreamChunkTransform,
} from './chat-complete';
import { mistralAIEmbedConfig, mistralAIEmbedResponseTransform } from './embed';

export const mistralAIConfig: AIProviderConfig = {
  api: mistralAIAPIConfig,
  [FunctionName.CHAT_COMPLETE]: mistralAIChatCompleteConfig,
  [FunctionName.EMBED]: mistralAIEmbedConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: mistralAIChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      mistralAIChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: mistralAIEmbedResponseTransform,
  },
};
