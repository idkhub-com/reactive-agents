import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';

import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  getAccessTokenFromEntraId,
  getAzureManagedIdentityToken,
} from '../azure-openai/utils';

const EndpointMap: Partial<Record<FunctionName, string>> = {
  [FunctionName.COMPLETE]: '/models/completions',
  [FunctionName.CHAT_COMPLETE]: '/models/chat/completions',
  [FunctionName.EMBED]: '/models/embeddings',
};

export const azureAIInferenceAPI: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget }) => {
    const { configuration, azure_ai_foundry_config } = raTarget;
    if (configuration.ai_provider === AIProvider.GITHUB) {
      return 'https://models.inference.ai.azure.com';
    }

    if (!azure_ai_foundry_config) {
      throw new Error('`azure_ai_foundry_config` is required in target');
    }

    return azure_ai_foundry_config.url;
  },
  headers: async ({ raTarget: providerOptions }) => {
    const { api_key, azure_extra_params, azure_ad_token, azure_auth_mode } =
      providerOptions;

    const headers: Record<string, string> = {
      'extra-parameters': azure_extra_params ?? 'drop',
    };
    if (azure_ad_token) {
      headers.Authorization = `Bearer ${azure_ad_token?.replace('Bearer ', '')}`;
      return headers;
    }

    if (azure_auth_mode === 'entra') {
      const {
        azure_entra_tenant_id,
        azure_entra_client_id,
        azure_entra_client_secret,
      } = providerOptions;
      if (
        azure_entra_tenant_id &&
        azure_entra_client_id &&
        azure_entra_client_secret
      ) {
        const scope = 'https://cognitiveservices.azure.com/.default';
        const accessToken = await getAccessTokenFromEntraId(
          azure_entra_tenant_id,
          azure_entra_client_id,
          azure_entra_client_secret,
          scope,
        );
        headers.Authorization = `Bearer ${accessToken}`;
        return headers;
      }
    }
    if (azure_auth_mode === 'managed') {
      const { azure_managed_client_id } = providerOptions;
      const resource = 'https://cognitiveservices.azure.com/';
      const accessToken = await getAzureManagedIdentityToken(
        resource,
        azure_managed_client_id,
      );
      headers.Authorization = `Bearer ${accessToken}`;
      return headers;
    }

    if (api_key) {
      headers.Authorization = `Bearer ${api_key}`;
      return headers;
    }
    return headers;
  },
  getEndpoint: ({ raRequestData }) => {
    const fn = raRequestData.functionName;
    const endpoint = EndpointMap[fn];
    if (!endpoint) {
      throw new Error(`Endpoint not found for function ${fn}`);
    }
    return endpoint;
  },
};
