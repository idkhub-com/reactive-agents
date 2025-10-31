import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const upstageAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.upstage.ai/v1/solar',
  headers: ({ raTarget }) => {
    return { Authorization: `Bearer ${raTarget.api_key}` };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.EMBED:
        return '/embeddings';
      case FunctionName.CREATE_MODEL_RESPONSE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
