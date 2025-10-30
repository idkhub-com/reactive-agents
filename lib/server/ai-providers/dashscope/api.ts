import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const dashscopeAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: (): string => 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  headers: ({ raTarget: providerOptions }) => {
    const { api_key } = providerOptions;
    return { Authorization: `Bearer ${api_key}` };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return `/chat/completions`;
      case FunctionName.EMBED:
        return `/embeddings`;
      default:
        return '';
    }
  },
};
