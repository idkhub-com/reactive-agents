import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { CreateTranslationResponseBody } from '@shared/types/api/routes/audio-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAICreateTranslationResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return openAIErrorResponseTransform(
        aiProviderResponseBody,
        AIProvider.OPENAI,
      );
    }

    return aiProviderResponseBody as CreateTranslationResponseBody;
  };
