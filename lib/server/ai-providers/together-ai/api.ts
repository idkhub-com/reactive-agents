import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const togetherAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.together.xyz',
  headers: ({ idkTarget }) => {
    return { Authorization: `Bearer ${idkTarget.api_key}` };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.COMPLETE:
        return '/v1/completions';
      case FunctionName.CHAT_COMPLETE:
        return '/v1/chat/completions';
      case FunctionName.EMBED:
        return '/v1/embeddings';
      default:
        return '';
    }
  },
};

export default togetherAIAPIConfig;
