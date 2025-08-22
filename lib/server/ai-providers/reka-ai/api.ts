import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const rekaAIApiConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.reka.ai',
  headers: ({ idkTarget }) => {
    return { Authorization: `Bearer ${idkTarget.api_key}` };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat';
      default:
        return '';
    }
  },
};

export default rekaAIApiConfig;
