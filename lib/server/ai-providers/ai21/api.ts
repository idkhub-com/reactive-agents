import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const aI21APIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.ai21.com/studio/v1',
  headers: ({ raTarget }) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${raTarget.api_key}`,
    };
    return headers;
  },
  getEndpoint: ({ raRequestData }) => {
    const { model } = raRequestData.requestBody as { model: string };
    switch (raRequestData.functionName) {
      case FunctionName.COMPLETE: {
        return `/${model}/complete`;
      }
      case FunctionName.CHAT_COMPLETE: {
        return `/${model}/chat`;
      }
      case FunctionName.EMBED: {
        return `/embed`;
      }
      default:
        return '';
    }
  },
};
