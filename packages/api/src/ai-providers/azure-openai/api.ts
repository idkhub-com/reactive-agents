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
  getBaseURL: ({ saTarget }) => {
    const { azure_openai_config } = saTarget;

    if (!azure_openai_config) {
      throw new Error('`azure_openai_config` is required in target');
    }

    return azure_openai_config.url;
  },
  headers: async ({ saTarget, saRequestData }) => {
    const { api_key, azure_auth_mode } = saTarget;

    if (azure_auth_mode === 'entra') {
      const {
        azure_entra_tenant_id,
        azure_entra_client_id,
        azure_entra_client_secret,
      } = saTarget;
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
      const { azure_managed_client_id } = saTarget;
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
      saRequestData.functionName === FunctionName.CREATE_TRANSCRIPTION ||
      saRequestData.functionName === FunctionName.CREATE_TRANSLATION ||
      saRequestData.functionName === FunctionName.UPLOAD_FILE
    ) {
      headersObj['Content-Type'] = 'multipart/form-data';
    }
    if (saTarget.openai_beta) {
      headersObj['OpenAI-Beta'] = saTarget.openai_beta;
    }
    return headersObj;
  },
  getEndpoint: ({ saRequestData }) => {
    const fn = saRequestData.functionName;
    const endpoint = EndpointMap[fn];
    if (!endpoint) {
      throw new Error(`Endpoint not found for function ${fn}`);
    }
    return endpoint;
  },
};
