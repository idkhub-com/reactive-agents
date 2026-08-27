import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const anthropicAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.anthropic.com/v1',
  headers: ({ saTarget, saRequestData }) => {
    const headers: Record<string, string> = {
      'X-API-Key': `${saTarget.api_key}`,
    };

    const betaHeader = saTarget.anthropic_beta ?? 'messages-2023-12-15';
    const version = saTarget.anthropic_version ?? '2023-06-01';

    if (
      saRequestData.functionName === FunctionName.CHAT_COMPLETE ||
      saRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE
    ) {
      headers['anthropic-beta'] = betaHeader;
    }
    headers['anthropic-version'] = version;
    return headers;
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.COMPLETE:
      case FunctionName.STREAM_COMPLETE:
        return '/complete';
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.STREAM_CHAT_COMPLETE:
        return '/messages';
      default:
        return '';
    }
  },
};
