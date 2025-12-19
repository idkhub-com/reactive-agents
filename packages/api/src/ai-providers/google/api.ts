import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

function getRouteVersion(_: string): string {
  return 'v1beta';
}

export const googleAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://generativelanguage.googleapis.com',
  headers: ({ raTarget }) => {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': raTarget.api_key ?? '',
    };
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE: {
        const model = raRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:generateContent`;
      }
      case FunctionName.STREAM_CHAT_COMPLETE: {
        const model = raRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:streamGenerateContent`;
      }
      case FunctionName.EMBED: {
        const model = raRequestData.requestBody.model;
        const routeVersion = getRouteVersion(model);
        return `/${routeVersion}/models/${model}:embedContent`;
      }
      default:
        return '';
    }
  },
};
