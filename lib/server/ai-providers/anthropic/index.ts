import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { anthropicAPIConfig } from './api';
import {
  anthropicChatCompleteConfig,
  anthropicChatCompleteResponseTransform,
  anthropicChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  anthropicCompleteConfig,
  anthropicCompleteResponseTransform,
  anthropicCompleteStreamChunkTransform,
} from './complete';
import { anthropicModelCapabilities } from './model-capabilities';

export const anthropicConfig: AIProviderConfig = {
  api: anthropicAPIConfig,
  modelCapabilities: anthropicModelCapabilities,
  [FunctionName.COMPLETE]: anthropicCompleteConfig,
  [FunctionName.STREAM_COMPLETE]: anthropicCompleteConfig,
  [FunctionName.CHAT_COMPLETE]: anthropicChatCompleteConfig,
  [FunctionName.STREAM_CHAT_COMPLETE]: anthropicChatCompleteConfig,
  responseTransforms: {
    [FunctionName.STREAM_COMPLETE]: anthropicCompleteStreamChunkTransform,
    [FunctionName.COMPLETE]: anthropicCompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: anthropicChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      anthropicChatCompleteStreamChunkTransform,
  },
};
