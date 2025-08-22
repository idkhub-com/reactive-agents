import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const segmindAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.segmind.com/v1',
  headers: ({ idkTarget }) => {
    return { 'x-api-key': `${idkTarget.api_key}` };
  },
  getEndpoint: ({ idkRequestData }) => {
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.GENERATE_IMAGE: {
        const model = idkRequestData.requestBody.model;

        // Validate model parameter to prevent invalid endpoints
        if (!model || typeof model !== 'string' || model.trim().length === 0) {
          throw new Error(
            'Model parameter is required for Segmind image generation',
          );
        }

        // Segmind uses model-specific endpoints for image generation
        // e.g., /v1/sdxl1.0-txt2img, /v1/fast-flux-schnell
        return `/${model.trim()}`;
      }
      default:
        return '/chat/completions';
    }
  },
};

export default segmindAPIConfig;
