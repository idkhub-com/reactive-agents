import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const cerebrasAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.cerebras.ai/v1',
  headers: ({ raTarget: providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.api_key}`,
      'User-Agent': 'Reactive Agents/1.0',
    };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
