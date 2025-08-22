import { splitString } from '@server/utils/ai-provider';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const predibaseAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://serving.app.predibase.com',
  headers: ({ idkTarget: providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.api_key}`,
      Accept: 'application/json',
    };
  },
  getEndpoint: ({ idkRequestData }) => {
    // const user = idkTarget.user;
    const user = 'predibase'; // TODO: Get from header config
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE: {
        const model = idkRequestData.requestBody?.model;
        const base_model = splitString(`${model}`, ':').before;
        /*
        The Predibase model format is "<base_model>[:adapter_id]",
        where adapter_id format is "<adapter_repository_reference/version_number"
        (version_number is required).
        */
        return `/${user}/deployments/v2/llms/${base_model}/v1/chat/completions`;
      }
      default:
        return '';
    }
  },
};
