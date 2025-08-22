import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import replicateAPIConfig from './api';
import {
  replicateChatCompleteConfig,
  replicateChatCompleteResponseTransform,
  replicateChatCompleteStreamChunkTransform,
} from './chat-complete';

export const replicateConfig: AIProviderConfig = {
  api: replicateAPIConfig,
  [FunctionName.CHAT_COMPLETE]: replicateChatCompleteConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: replicateChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      replicateChatCompleteStreamChunkTransform,
  },
};
