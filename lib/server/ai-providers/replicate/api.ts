import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const replicateAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.replicate.com/v1',
  headers: ({ idkTarget }) => {
    return { Authorization: `Bearer ${idkTarget.api_key}` };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/predictions'; // Replicate uses predictions endpoint for all model runs
      default:
        return '/predictions';
    }
  },
};

export default replicateAPIConfig;
