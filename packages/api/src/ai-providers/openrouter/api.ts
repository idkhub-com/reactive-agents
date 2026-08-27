import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const openrouterAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://openrouter.ai/api',
  headers: ({ saTarget }) => {
    return {
      Authorization: `Bearer ${saTarget.api_key}`, // https://openrouter.ai/keys
      'HTTP-Referer': 'https://superagents.ai/',
      'X-Title': 'Super Agents',
    };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/v1/chat/completions';
      default:
        return '';
    }
  },
};

export default openrouterAPIConfig;
