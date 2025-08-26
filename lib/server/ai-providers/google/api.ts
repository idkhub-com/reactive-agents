import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

function getRouteVersion(_: string): string {
  return 'v1beta';
}

export const googleAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://generativelanguage.googleapis.com',
  headers: () => {
    return { 'Content-Type': 'application/json' };
  },
  getEndpoint: ({ idkTarget, idkRequestData }) => {
    const { api_key } = idkTarget;
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE: {
        const model = idkRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:generateContent?key=${api_key}`;
      }
      case FunctionName.STREAM_CHAT_COMPLETE: {
        const model = idkRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:streamGenerateContent?key=${api_key}`;
      }
      case FunctionName.EMBED: {
        const model = idkRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:embedContent?key=${api_key}`;
      }
      default:
        return '';
    }
  },
};
