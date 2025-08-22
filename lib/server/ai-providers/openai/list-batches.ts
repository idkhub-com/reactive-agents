import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ListBatchesResponseBody } from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAIListBatchesResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody as ErrorResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as ListBatchesResponseBody;
};
