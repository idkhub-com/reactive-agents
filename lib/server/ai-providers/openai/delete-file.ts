import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { FileDeleteResponseBody } from '@shared/types/api/routes/files-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAIDeleteFileResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiResponseStatus,
) => {
  if (aiResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as unknown as FileDeleteResponseBody;
};
