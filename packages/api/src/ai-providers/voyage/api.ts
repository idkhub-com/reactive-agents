import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const voyageAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.voyageai.com/v1',
  headers: ({ saTarget }) => {
    return {
      Authorization: `Bearer ${saTarget.api_key}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.EMBED:
        return '/embeddings';
      default:
        return '';
    }
  },
};
