import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const sambanovaAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ saTarget }) =>
    saTarget.custom_host || 'https://api.sambanova.ai',
  headers: ({ saTarget }) => {
    return { Authorization: `Bearer ${saTarget.api_key}` };
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

export default sambanovaAPIConfig;
