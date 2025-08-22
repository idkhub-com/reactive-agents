import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const anthropicAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.anthropic.com/v1',
  headers: ({ idkTarget, idkRequestData }) => {
    const headers: Record<string, string> = {
      'X-API-Key': `${idkTarget.api_key}`,
    };

    const betaHeader = idkTarget.anthropic_beta ?? 'messages-2023-12-15';
    const version = idkTarget.anthropic_version ?? '2023-06-01';

    if (idkRequestData.functionName === FunctionName.CHAT_COMPLETE) {
      headers['anthropic-beta'] = betaHeader;
    }
    headers['anthropic-version'] = version;
    return headers;
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.COMPLETE:
        return '/complete';
      case FunctionName.CHAT_COMPLETE:
        return '/messages';
      default:
        return '';
    }
  },
};
