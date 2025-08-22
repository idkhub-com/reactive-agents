import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const sambanovaAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget }) =>
    idkTarget.custom_host || 'https://api.sambanova.ai',
  headers: ({ idkTarget }) => {
    return { Authorization: `Bearer ${idkTarget.api_key}` };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/v1/chat/completions';
      default:
        return '';
    }
  },
};

export default sambanovaAPIConfig;
