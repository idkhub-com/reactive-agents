import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import openrouterAPIConfig from './api';
import {
  openrouterChatCompleteConfig,
  openrouterChatCompleteResponseTransform,
  openrouterChatCompleteStreamChunkTransform,
} from './chat-complete';

export const openrouterConfig: AIProviderConfig = {
  api: openrouterAPIConfig,
  [FunctionName.CHAT_COMPLETE]: openrouterChatCompleteConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: openrouterChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      openrouterChatCompleteStreamChunkTransform,
  },
  requestTransforms: {},
};
