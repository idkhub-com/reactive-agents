import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const upstageAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.upstage.ai/v1/solar',
  headers: ({ saTarget }) => {
    return { Authorization: `Bearer ${saTarget.api_key}` };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
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
