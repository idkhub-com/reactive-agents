import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const recraftAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://external.api.recraft.ai/v1',
  headers: ({ raTarget }) => ({
    Authorization: `Bearer ${raTarget.api_key}`,
    'Content-Type': 'application/json',
  }),
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.GENERATE_IMAGE:
        return '/images/generations';
      default:
        return '';
    }
  },
};

export default recraftAIAPIConfig;
