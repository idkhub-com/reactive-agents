import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import {
  getAccessTokenFromEntraId,
  getAzureManagedIdentityToken,
} from './utils';

export const azureOpenAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget: providerOptions }) => {
    const { azure_resource_name } = providerOptions;
    return `https://${azure_resource_name}.openai.azure.com/openai`;
  },
  headers: async ({ idkTarget: providerOptions, idkRequestData }) => {
    const { api_key, azure_auth_mode } = providerOptions;

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
        return {
          Authorization: `Bearer ${accessToken}`,
        };
      }
    }
    if (azure_auth_mode === 'managed') {
      const { azure_managed_client_id } = providerOptions;
      const resource = 'https://cognitiveservices.azure.com/';
      const accessToken = await getAzureManagedIdentityToken(
        resource,
        azure_managed_client_id,
      );
      return {
        Authorization: `Bearer ${accessToken}`,
      };
    }
    const headersObj: Record<string, string> = {
      'api-key': `${api_key}`,
    };
    if (
      idkRequestData.functionName === FunctionName.CREATE_TRANSCRIPTION ||
      idkRequestData.functionName === FunctionName.CREATE_TRANSLATION ||
      idkRequestData.functionName === FunctionName.UPLOAD_FILE
    ) {
      headersObj['Content-Type'] = 'multipart/form-data';
    }
    if (providerOptions.openai_beta) {
      headersObj['OpenAI-Beta'] = providerOptions.openai_beta;
    }
    return headersObj;
  },
  getEndpoint: ({ idkTarget, idkRequestData }) => {
    const { azure_api_version, azure_url_to_fetch, azure_deployment_id } =
      idkTarget;
    let mappedFn: FunctionName = idkRequestData.functionName;

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
      } else if (azure_url_to_fetch?.indexOf('/images/generations') > -1) {
        mappedFn = FunctionName.GENERATE_IMAGE;
      } else if (azure_url_to_fetch?.indexOf('/audio/speech') > -1) {
        mappedFn = FunctionName.CREATE_SPEECH;
      } else if (azure_url_to_fetch?.indexOf('/audio/transcriptions') > -1) {
        mappedFn = FunctionName.CREATE_TRANSCRIPTION;
      } else if (azure_url_to_fetch?.indexOf('/audio/translations') > -1) {
        mappedFn = FunctionName.CREATE_TRANSLATION;
      }
    }

    const urlObj = new URL(idkRequestData.url);
    const pathname = urlObj.pathname.replace('/v1', '');
    const searchParams = urlObj.searchParams;
    if (azure_api_version) {
      searchParams.set('api-version', azure_api_version);
    }

    switch (mappedFn as FunctionName) {
      case FunctionName.COMPLETE: {
        return `/deployments/${azure_deployment_id}/completions?api-version=${azure_api_version}`;
      }
      case FunctionName.CHAT_COMPLETE: {
        return `/deployments/${azure_deployment_id}/chat/completions?api-version=${azure_api_version}`;
      }
      case FunctionName.EMBED: {
        return `/deployments/${azure_deployment_id}/embeddings?api-version=${azure_api_version}`;
      }
      case FunctionName.GENERATE_IMAGE: {
        return `/deployments/${azure_deployment_id}/images/generations?api-version=${azure_api_version}`;
      }
      case FunctionName.CREATE_SPEECH: {
        return `/deployments/${azure_deployment_id}/audio/speech?api-version=${azure_api_version}`;
      }
      case FunctionName.CREATE_TRANSCRIPTION: {
        return `/deployments/${azure_deployment_id}/audio/transcriptions?api-version=${azure_api_version}`;
      }
      case FunctionName.CREATE_TRANSLATION: {
        return `/deployments/${azure_deployment_id}/audio/translations?api-version=${azure_api_version}`;
      }
      case FunctionName.REALTIME: {
        return `/realtime?api-version=${azure_api_version}&deployment=${azure_deployment_id}`;
      }
      case FunctionName.CREATE_MODEL_RESPONSE: {
        return `${pathname}?${searchParams.toString()}`;
      }
      case FunctionName.GET_MODEL_RESPONSE: {
        return `${pathname}?${searchParams.toString()}`;
      }
      case FunctionName.DELETE_MODEL_RESPONSE: {
        return `${pathname}?${searchParams.toString()}`;
      }
      case FunctionName.LIST_RESPONSE_INPUT_ITEMS: {
        return `${pathname}?${searchParams.toString()}`;
      }
      case FunctionName.UPLOAD_FILE:
      case FunctionName.RETRIEVE_FILE:
      case FunctionName.LIST_FILES:
      case FunctionName.DELETE_FILE:
      case FunctionName.RETRIEVE_FILE_CONTENT:
      case FunctionName.CREATE_FINE_TUNING_JOB:
      case FunctionName.RETRIEVE_FINE_TUNING_JOB:
      case FunctionName.LIST_FINE_TUNING_JOBS:
      case FunctionName.CANCEL_FINE_TUNING_JOB:
      case FunctionName.CREATE_BATCH:
      case FunctionName.RETRIEVE_BATCH:
      case FunctionName.CANCEL_BATCH:
      case FunctionName.LIST_BATCHES:
        return `${pathname}?api-version=${azure_api_version}`;
      default:
        return '';
    }
  },
  getProxyEndpoint: ({ reqPath, reqQuery, idkTarget }) => {
    const { azure_api_version } = idkTarget;
    if (!azure_api_version) return `${reqPath}${reqQuery}`;
    if (!reqQuery?.includes('api-version')) {
      let _reqQuery = reqQuery;
      if (!reqQuery) {
        _reqQuery = `?api-version=${azure_api_version}`;
      } else {
        _reqQuery += `&api-version=${azure_api_version}`;
      }
      return `${reqPath}${_reqQuery}`;
    }
    return `${reqPath}${reqQuery}`;
  },
};
