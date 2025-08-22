import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const cerebrasAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.cerebras.ai/v1',
  headers: ({ idkTarget: providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.api_key}`,
      'User-Agent': 'Portkey Gateway/1.0',
    };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
