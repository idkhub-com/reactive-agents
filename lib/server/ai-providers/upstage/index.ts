import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  createModelResponseParams,
  embedParams,
  responseTransformers,
} from '../open-ai-base';
import { upstageAPIConfig } from './api';
import {
  upstageChatCompleteConfig,
  upstageChatCompleteResponseTransform,
  upstageChatCompleteStreamChunkTransform,
} from './chat-complete';

export const upstageConfig: AIProviderConfig = {
  api: upstageAPIConfig,
  [FunctionName.CHAT_COMPLETE]: upstageChatCompleteConfig,
  [FunctionName.EMBED]: embedParams([], {
    model: 'solar-embedding-1-large-query',
  }),
  [FunctionName.CREATE_MODEL_RESPONSE]: createModelResponseParams([]),
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: upstageChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      upstageChatCompleteStreamChunkTransform,
    ...responseTransformers(AIProvider.UPSTAGE, {
      embed: true,
    }),
  },
};
