import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const voyageAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.voyageai.com/v1',
  headers: ({ idkTarget }) => {
    return {
      Authorization: `Bearer ${idkTarget.api_key}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.EMBED:
        return '/embeddings';
      default:
        return '';
    }
  },
};
