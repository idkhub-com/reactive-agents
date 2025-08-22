import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';

export const palmApiConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://generativelanguage.googleapis.com/v1beta3',
  headers: () => {
    return { 'Content-Type': 'application/json' };
  },
  getEndpoint: ({ idkTarget, idkRequestData }) => {
    const { api_key } = idkTarget;
    const { model } = idkRequestData.requestBody as ChatCompletionRequestBody;
    switch (idkRequestData.functionName) {
      case FunctionName.COMPLETE: {
        return `/models/${model}:generateText?key=${api_key}`;
      }
      case FunctionName.CHAT_COMPLETE: {
        return `/models/${model}:generateMessage?key=${api_key}`;
      }
      case FunctionName.EMBED: {
        return `/models/${model}:embedText?key=${api_key}`;
      }
      default:
        return '';
    }
  },
};
