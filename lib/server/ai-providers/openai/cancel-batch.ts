import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { CancelBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAICancelBatchResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as unknown as CancelBatchResponseBody;
};
