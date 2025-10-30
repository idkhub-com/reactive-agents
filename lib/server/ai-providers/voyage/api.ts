import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const voyageAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.voyageai.com/v1',
  headers: ({ raTarget }) => {
    return {
      Authorization: `Bearer ${raTarget.api_key}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.EMBED:
        return '/embeddings';
      default:
        return '';
    }
  },
};
