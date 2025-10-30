import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const rekaAIApiConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.reka.ai',
  headers: ({ raTarget }) => {
    return { Authorization: `Bearer ${raTarget.api_key}` };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat';
      default:
        return '';
    }
  },
};

export default rekaAIApiConfig;
