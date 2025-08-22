import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const deepbricksAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.deepbricks.ai/v1',
  headers: ({ idkTarget: providerOptions }) => {
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${providerOptions.api_key}`,
    };
    if (providerOptions.openai_organization) {
      headersObj['Deepbricks-Organization'] =
        providerOptions.openai_organization;
    }

    if (providerOptions.openai_project) {
      headersObj['Deepbricks-Project'] = providerOptions.openai_project;
    }

    return headersObj;
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.GENERATE_IMAGE:
        return '/images/generations';
      default:
        return '';
    }
  },
};
