import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const recraftAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://external.api.recraft.ai/v1',
  headers: ({ idkTarget }) => ({
    Authorization: `Bearer ${idkTarget.api_key}`,
    'Content-Type': 'application/json',
  }),
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.GENERATE_IMAGE:
        return '/images/generations';
      default:
        return '';
    }
  },
};

export default recraftAIAPIConfig;
