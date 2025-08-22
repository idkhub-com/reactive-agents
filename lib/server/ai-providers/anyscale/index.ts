import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { anyscaleAPIConfig } from './api';
import {
  anyscaleChatCompleteConfig,
  anyscaleChatCompleteResponseTransform,
  anyscaleChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  anyscaleCompleteConfig,
  anyscaleCompleteResponseTransform,
  anyscaleCompleteStreamChunkTransform,
} from './complete';
import { anyscaleEmbedConfig, anyscaleEmbedResponseTransform } from './embed';

export const anyscaleConfig: AIProviderConfig = {
  api: anyscaleAPIConfig,
  [FunctionName.COMPLETE]: anyscaleCompleteConfig,
  [FunctionName.CHAT_COMPLETE]: anyscaleChatCompleteConfig,
  [FunctionName.EMBED]: anyscaleEmbedConfig,
  responseTransforms: {
    [FunctionName.STREAM_COMPLETE]: anyscaleCompleteStreamChunkTransform,
    [FunctionName.COMPLETE]: anyscaleCompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: anyscaleChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      anyscaleChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: anyscaleEmbedResponseTransform,
  },
};
