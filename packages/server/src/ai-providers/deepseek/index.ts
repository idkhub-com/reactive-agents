import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import deepSeekAPIConfig from './api';
import {
  deepSeekChatCompleteConfig,
  deepSeekChatCompleteResponseTransform,
  deepSeekChatCompleteStreamChunkTransform,
} from './chat-complete';

export const deepSeekConfig: AIProviderConfig = {
  api: deepSeekAPIConfig,
  [FunctionName.CHAT_COMPLETE]: deepSeekChatCompleteConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: deepSeekChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      deepSeekChatCompleteStreamChunkTransform,
  },
};
