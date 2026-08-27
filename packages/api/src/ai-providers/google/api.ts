import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

function getRouteVersion(_: string): string {
  return 'v1beta';
}

export const googleAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://generativelanguage.googleapis.com',
  headers: ({ saTarget }) => {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': saTarget.api_key ?? '',
    };
  },
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE: {
        const model = saRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:generateContent`;
      }
      case FunctionName.STREAM_CHAT_COMPLETE: {
        const model = saRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:streamGenerateContent`;
      }
      case FunctionName.EMBED: {
        const model = saRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:embedContent`;
      }
      default:
        return '';
    }
  },
};
