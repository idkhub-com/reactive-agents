import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const qdrantAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ saTarget: providerOptions }) => {
    return providerOptions.custom_host || '';
  },
  headers: ({ saTarget: providerOptions }) => {
    return { 'api-key': `Bearer ${providerOptions.api_key}` };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/v1/chat/completions';
      default:
        return '';
    }
  },
};

export default qdrantAPIConfig;
