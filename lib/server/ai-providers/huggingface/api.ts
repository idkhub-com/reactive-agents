import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const HuggingfaceAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget }) => {
    return (
      idkTarget.huggingface_base_url || 'https://api-inference.huggingface.co'
    );
  },
  headers: ({ idkTarget }) => ({
    Authorization: `Bearer ${idkTarget.api_key}`,
  }),
  getEndpoint: ({ idkRequestData, idkTarget }) => {
    const { model } = idkRequestData.requestBody as { model: string };
    const modelPath = idkTarget.huggingface_base_url ? '' : `/models/${model}`;
    switch (idkRequestData.functionName) {
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
