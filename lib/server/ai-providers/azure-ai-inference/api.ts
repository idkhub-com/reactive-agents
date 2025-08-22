import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';

import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  getAccessTokenFromEntraId,
  getAzureManagedIdentityToken,
} from '../azure-openai/utils';

export const azureAIInferenceAPI: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget: providerOptions }) => {
    const { provider, azure_foundry_url } = providerOptions;
    if (provider === AIProvider.GITHUB) {
      return 'https://models.inference.ai.azure.com';
    }
    if (azure_foundry_url) {
      return azure_foundry_url;
    }

    return '';
  },
  headers: async ({ idkTarget: providerOptions }) => {
    const {
      api_key,
      azure_extra_params,
      azure_deployment_name,
      azure_ad_token,
      azure_auth_mode,
    } = providerOptions;

    const headers: Record<string, string> = {
      'extra-parameters': azure_extra_params ?? 'drop',
      ...(azure_deployment_name && {
        'azureml-model-deployment': azure_deployment_name,
      }),
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
  getEndpoint: ({ idkTarget, idkRequestData }) => {
    const { azure_api_version, azure_url_to_fetch } = idkTarget;
    let mappedFn = idkRequestData.functionName;

    const ENDPOINT_MAPPING: Record<string, string> = {
      complete: '/completions',
      chatComplete: '/chat/completions',
      embed: '/embeddings',
    };

    const isGithub = idkTarget.provider === AIProvider.GITHUB;

    if (
      idkRequestData.functionName === FunctionName.PROXY &&
      azure_url_to_fetch
    ) {
      if (azure_url_to_fetch?.indexOf('/chat/completions') > -1) {
        mappedFn = FunctionName.CHAT_COMPLETE;
      } else if (azure_url_to_fetch?.indexOf('/completions') > -1) {
        mappedFn = FunctionName.COMPLETE;
      } else if (azure_url_to_fetch?.indexOf('/embeddings') > -1) {
        mappedFn = FunctionName.EMBED;
      }
    }

    const api_version = azure_api_version
      ? `?api-version=${azure_api_version}`
      : '';
    switch (mappedFn) {
      case FunctionName.COMPLETE: {
        return isGithub
          ? ENDPOINT_MAPPING[mappedFn]
          : `${ENDPOINT_MAPPING[mappedFn]}${api_version}`;
      }
      case FunctionName.CHAT_COMPLETE: {
        return isGithub
          ? ENDPOINT_MAPPING[mappedFn]
          : `${ENDPOINT_MAPPING[mappedFn]}${api_version}`;
      }
      case FunctionName.EMBED: {
        return isGithub
          ? ENDPOINT_MAPPING[mappedFn]
          : `${ENDPOINT_MAPPING[mappedFn]}${api_version}`;
      }
      default:
        return '';
    }
  },
};
