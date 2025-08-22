import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const deepInfraApiConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.deepinfra.com/v1/openai',
  headers: ({ idkTarget: providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.api_key}`,
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
