import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { predibaseAPIConfig } from './api';
import {
  predibaseChatCompleteConfig,
  predibaseChatCompleteResponseTransform,
  predibaseChatCompleteStreamChunkTransform,
} from './chat-complete';

export const predibaseConfig: AIProviderConfig = {
  api: predibaseAPIConfig,
  [FunctionName.CHAT_COMPLETE]: predibaseChatCompleteConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: predibaseChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      predibaseChatCompleteStreamChunkTransform,
  },
};
