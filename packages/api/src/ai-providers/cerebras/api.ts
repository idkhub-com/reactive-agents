import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const cerebrasAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.cerebras.ai/v1',
  headers: ({ saTarget: providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.api_key}`,
      'User-Agent': 'Super Agents/1.0',
    };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
