import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const sambanovaAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget }) =>
    raTarget.custom_host || 'https://api.sambanova.ai',
  headers: ({ raTarget }) => {
    return { Authorization: `Bearer ${raTarget.api_key}` };
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

export default sambanovaAPIConfig;
