import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const rekaAIApiConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.reka.ai',
  headers: ({ saTarget }) => {
    return { Authorization: `Bearer ${saTarget.api_key}` };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat';
      default:
        return '';
    }
  },
};

export default rekaAIApiConfig;
