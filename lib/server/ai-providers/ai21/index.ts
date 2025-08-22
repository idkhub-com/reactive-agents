import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { aI21APIConfig } from './api';
import {
  aI21ChatCompleteConfig,
  aI21ChatCompleteResponseTransform,
} from './chat-complete';
import { aI21CompleteConfig, aI21CompleteResponseTransform } from './complete';
import { aI21EmbedConfig, aI21EmbedResponseTransform } from './embed';

export const aI21Config: AIProviderConfig = {
  api: aI21APIConfig,
  [FunctionName.COMPLETE]: aI21CompleteConfig,
  [FunctionName.EMBED]: aI21EmbedConfig,
  [FunctionName.CHAT_COMPLETE]: aI21ChatCompleteConfig,
  requestTransforms: {},
  responseTransforms: {
    [FunctionName.COMPLETE]: aI21CompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: aI21ChatCompleteResponseTransform,
    [FunctionName.EMBED]: aI21EmbedResponseTransform,
  },
};
