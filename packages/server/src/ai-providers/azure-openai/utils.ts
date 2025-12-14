import type { AzureOpenAIFinetuneResponse } from '@server/ai-providers/azure-openai/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type { CreateFineTuningJobResponseBody } from '@shared/types/api/routes/fine-tuning-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

export async function getAccessTokenFromEntraId(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  scope = 'https://cognitiveservices.azure.com/.default',
): Promise<string | undefined> {
  try {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: scope,
      grant_type: 'client_credentials',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error from Entra ${errorMessage}`);
    }
    const data: { access_token: string } = await response.json();
    return data.access_token;
  } catch (error) {
    throw new Error(`Error getting access token from Entra ID: ${error}`);
  }
}

export async function getAzureManagedIdentityToken(
  resource: string,
  clientId?: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=${encodeURIComponent(resource)}${clientId ? `&client_id=${encodeURIComponent(clientId)}` : ''}`,
      {
        method: 'GET',
        headers: {
          Metadata: 'true',
        },
      },
    );
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error from Managed ${errorMessage}`);
    }
    const data: { access_token: string } = await response.json();
    return data.access_token;
  } catch (error) {
    throw new Error(
      `Error getting access token from Managed Identity: ${error}`,
    );
  }
}

export const azureOpenAIFinetuneResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody as ErrorResponseBody,
      AIProvider.AZURE_OPENAI,
    );
  }

  const _response = {
    ...aiProviderResponseBody,
  } as AzureOpenAIFinetuneResponse;

  if (['created', 'pending'].includes(_response.status)) {
    _response.status = 'queued';
  }

  return _response as CreateFineTuningJobResponseBody;
};
