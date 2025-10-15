import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import OllamaAPIConfig from './api';
import {
  OllamaChatCompleteConfig,
  OllamaChatCompleteResponseTransform,
  OllamaChatCompleteStreamChunkTransform,
} from './chat-complete';
import { OllamaEmbedConfig, OllamaEmbedResponseTransform } from './embed';

export const ollamaConfig: AIProviderConfig = {
  api: OllamaAPIConfig,
  [FunctionName.CHAT_COMPLETE]: OllamaChatCompleteConfig,
  [FunctionName.EMBED]: OllamaEmbedConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: OllamaChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]: OllamaChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: OllamaEmbedResponseTransform,
  },
};
