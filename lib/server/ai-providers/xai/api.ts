import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const xaiAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.x.ai/v1',
  headers: ({ idkTarget }) => {
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${idkTarget.api_key}`,
      'Content-Type': 'application/json',
    };

    return headersObj;
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
