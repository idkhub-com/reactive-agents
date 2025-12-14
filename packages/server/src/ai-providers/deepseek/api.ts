import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const deepSeekAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.deepseek.com',
  headers: ({ raTarget: providerOptions }) => {
    return { Authorization: `Bearer ${providerOptions.api_key}` }; // https://platform.deepseek.com/api_keys
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/v1/chat/completions';
      default:
        return '';
    }
  },
};

export default deepSeekAPIConfig;
