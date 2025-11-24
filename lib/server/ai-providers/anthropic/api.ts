import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const anthropicAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.anthropic.com/v1',
  headers: ({ raTarget, raRequestData }) => {
    const headers: Record<string, string> = {
      'X-API-Key': `${raTarget.api_key}`,
    };

    const betaHeader = raTarget.anthropic_beta ?? 'messages-2023-12-15';
    const version = raTarget.anthropic_version ?? '2023-06-01';

    if (
      raRequestData.functionName === FunctionName.CHAT_COMPLETE ||
      raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE
    ) {
      headers['anthropic-beta'] = betaHeader;
    }
    headers['anthropic-version'] = version;
    return headers;
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
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
