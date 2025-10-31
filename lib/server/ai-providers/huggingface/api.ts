import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const HuggingfaceAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget }) => {
    return (
      raTarget.huggingface_base_url || 'https://api-inference.huggingface.co'
    );
  },
  headers: ({ raTarget }) => ({
    Authorization: `Bearer ${raTarget.api_key}`,
  }),
  getEndpoint: ({ raRequestData, raTarget }) => {
    const { model } = raRequestData.requestBody as { model: string };
    const modelPath = raTarget.huggingface_base_url ? '' : `/models/${model}`;
    switch (raRequestData.functionName) {
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
