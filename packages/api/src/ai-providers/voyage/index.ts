import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { voyageAPIConfig } from './api';
import { voyageEmbedConfig, voyageEmbedResponseTransform } from './embed';

export const voyageConfig: AIProviderConfig = {
  api: voyageAPIConfig,
  [FunctionName.EMBED]: voyageEmbedConfig,
  responseTransforms: {
    [FunctionName.EMBED]: voyageEmbedResponseTransform,
  },
};
