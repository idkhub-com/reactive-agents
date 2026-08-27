import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const HuggingfaceAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ saTarget }) => {
    return (
      saTarget.huggingface_base_url || 'https://api-inference.huggingface.co'
    );
  },
  headers: ({ saTarget }) => ({
    Authorization: `Bearer ${saTarget.api_key}`,
  }),
  getEndpoint: ({ saRequestData, saTarget }) => {
    const { model } = saRequestData.requestBody as { model: string };
    const modelPath = saTarget.huggingface_base_url ? '' : `/models/${model}`;
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return `${modelPath}/v1/chat/completions`;
      case FunctionName.COMPLETE:
        return `${modelPath}/v1/completions`;
      default:
        return '';
    }
  },
};

export default HuggingfaceAPIConfig;
