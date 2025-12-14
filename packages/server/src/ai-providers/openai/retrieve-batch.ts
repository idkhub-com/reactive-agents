import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { RetrieveBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAIRetrieveBatchResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody as ErrorResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as RetrieveBatchResponseBody;
};
