import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const openrouterAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://openrouter.ai/api',
  headers: ({ idkTarget }) => {
    return {
      Authorization: `Bearer ${idkTarget.api_key}`, // https://openrouter.ai/keys
      'HTTP-Referer': 'https://portkey.ai/',
      'X-Title': 'IDK',
    };
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

export default openrouterAPIConfig;
