import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const openrouterAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://openrouter.ai/api',
  headers: ({ raTarget }) => {
    return {
      Authorization: `Bearer ${raTarget.api_key}`, // https://openrouter.ai/keys
      'HTTP-Referer': 'https://reactiveagents.ai/',
      'X-Title': 'Reactive Agents',
    };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/v1/chat/completions';
      default:
        return '';
    }
  },
};

export default openrouterAPIConfig;
