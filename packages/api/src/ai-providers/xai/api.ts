import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const xaiAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.x.ai/v1',
  headers: ({ raTarget }) => {
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${raTarget.api_key}`,
      'Content-Type': 'application/json',
    };

    return headersObj;
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
