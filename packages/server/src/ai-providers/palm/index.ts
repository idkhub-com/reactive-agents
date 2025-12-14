import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { palmApiConfig } from './api';
import {
  palmChatCompleteConfig,
  palmChatCompleteResponseTransform,
} from './chat-complete';
import { palmCompleteConfig, palmCompleteResponseTransform } from './complete';
import { palmEmbedConfig, palmEmbedResponseTransform } from './embed';

export const palmAIConfig: AIProviderConfig = {
  api: palmApiConfig,
  [FunctionName.COMPLETE]: palmCompleteConfig,
  [FunctionName.EMBED]: palmEmbedConfig,
  [FunctionName.CHAT_COMPLETE]: palmChatCompleteConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: palmCompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: palmChatCompleteResponseTransform,
    [FunctionName.EMBED]: palmEmbedResponseTransform,
  },
};
