import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { ollamaAPIConfig } from './api';
import {
  ollamaChatCompleteConfig,
  ollamaChatCompleteResponseTransform,
  ollamaChatCompleteStreamChunkTransform,
} from './chat-complete';
import { ollamaEmbedConfig, ollamaEmbedResponseTransform } from './embed';

export const ollamaConfig: AIProviderConfig = {
  api: ollamaAPIConfig,
  [FunctionName.CHAT_COMPLETE]: ollamaChatCompleteConfig,
  [FunctionName.STREAM_CHAT_COMPLETE]: ollamaChatCompleteConfig,
  [FunctionName.EMBED]: ollamaEmbedConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: ollamaChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]: ollamaChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: ollamaEmbedResponseTransform,
  },
};
