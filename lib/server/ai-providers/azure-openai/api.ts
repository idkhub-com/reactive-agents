import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import {
  getAccessTokenFromEntraId,
  getAzureManagedIdentityToken,
} from './utils';

const EndpointMap: Partial<Record<FunctionName, string>> = {
  [FunctionName.COMPLETE]: '/openai/v1/completions',
  [FunctionName.CHAT_COMPLETE]: '/openai/v1/chat/completions',
  [FunctionName.EMBED]: '/openai/v1/models/embeddings',
  [FunctionName.CREATE_MODEL_RESPONSE]: '/openai/v1/responses',
};

export const azureOpenAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget }) => {
    const { azure_openai_config } = raTarget;

    if (!azure_openai_config) {
      throw new Error('`azure_openai_config` is required in target');
    }

    return azure_openai_config.url;
  },
  headers: async ({ raTarget, raRequestData }) => {
    const { api_key, azure_auth_mode } = raTarget;

    if (azure_auth_mode === 'entra') {
      const {
        azure_entra_tenant_id,
        azure_entra_client_id,
        azure_entra_client_secret,
      } = raTarget;
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
      const { azure_managed_client_id } = raTarget;
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
      raRequestData.functionName === FunctionName.CREATE_TRANSCRIPTION ||
      raRequestData.functionName === FunctionName.CREATE_TRANSLATION ||
      raRequestData.functionName === FunctionName.UPLOAD_FILE
    ) {
      headersObj['Content-Type'] = 'multipart/form-data';
    }
    if (raTarget.openai_beta) {
      headersObj['OpenAI-Beta'] = raTarget.openai_beta;
    }
    return headersObj;
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
