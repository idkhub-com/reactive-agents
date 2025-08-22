import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { deepInfraApiConfig } from './api';
import {
  deepInfraChatCompleteConfig,
  deepInfraChatCompleteResponseTransform,
  deepInfraChatCompleteStreamChunkTransform,
} from './chat-complete';

export const deepInfraConfig: AIProviderConfig = {
  api: deepInfraApiConfig,
  [FunctionName.CHAT_COMPLETE]: deepInfraChatCompleteConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: deepInfraChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      deepInfraChatCompleteStreamChunkTransform,
  },
};
