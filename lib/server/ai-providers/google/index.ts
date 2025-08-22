import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { googleAPIConfig } from './api';
import {
  googleChatCompleteConfig,
  googleChatCompleteResponseTransform,
  googleChatCompleteStreamChunkTransform,
} from './chat-complete';
import { googleEmbedConfig, googleEmbedResponseTransform } from './embed';

export const googleConfig: AIProviderConfig = {
  api: googleAPIConfig,
  [FunctionName.CHAT_COMPLETE]: googleChatCompleteConfig,
  [FunctionName.EMBED]: googleEmbedConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: googleChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]: googleChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: googleEmbedResponseTransform,
  },
};
