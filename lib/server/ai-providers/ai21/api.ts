import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const aI21APIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.ai21.com/studio/v1',
  headers: ({ idkTarget }) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${idkTarget.api_key}`,
    };
    return headers;
  },
  getEndpoint: ({ idkRequestData }) => {
    const { model } = idkRequestData.requestBody as { model: string };
    switch (idkRequestData.functionName) {
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
