import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const anyscaleAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.endpoints.anyscale.com/v1',
  headers: ({ idkTarget: providerOptions }) => {
    return { Authorization: `Bearer ${providerOptions.api_key}` };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.COMPLETE:
        return '/completions';
      case FunctionName.EMBED:
        return '/embeddings';
      default:
        return '';
    }
  },
};
