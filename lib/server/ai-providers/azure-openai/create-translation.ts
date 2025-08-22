import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { CreateTranslationResponseBody } from '@shared/types/api/routes/audio-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

export const azureOpenAICreateTranslationResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return openAIErrorResponseTransform(
        aiProviderResponseBody,
        AIProvider.AZURE_OPENAI,
      );
    }

    return aiProviderResponseBody as unknown as CreateTranslationResponseBody;
  };
