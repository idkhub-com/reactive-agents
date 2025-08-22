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

export const anthropicConfig: AIProviderConfig = {
  api: anthropicAPIConfig,
  [FunctionName.COMPLETE]: anthropicCompleteConfig,
  [FunctionName.CHAT_COMPLETE]: anthropicChatCompleteConfig,
  responseTransforms: {
    [FunctionName.STREAM_COMPLETE]: anthropicCompleteStreamChunkTransform,
    [FunctionName.COMPLETE]: anthropicCompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: anthropicChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      anthropicChatCompleteStreamChunkTransform,
  },
};
