import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const siliconFlowAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.siliconflow.cn/v1',
  headers: ({ raTarget }) => {
    return {
      Authorization: `Bearer ${raTarget.api_key}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
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
