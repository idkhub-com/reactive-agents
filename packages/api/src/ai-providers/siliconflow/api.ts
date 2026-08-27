import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const siliconFlowAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.siliconflow.cn/v1',
  headers: ({ saTarget }) => {
    return {
      Authorization: `Bearer ${saTarget.api_key}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.EMBED:
        return '/embeddings';
      case FunctionName.GENERATE_IMAGE:
        return '/images/generations';
      default:
        return '';
    }
  },
};

export default siliconFlowAPIConfig;
