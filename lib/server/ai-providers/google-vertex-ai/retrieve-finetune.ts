import type {
  GoogleErrorResponse,
  GoogleFinetuneRecord,
} from '@server/ai-providers/google/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import { GoogleErrorResponseTransform, googleToOpenAIFinetune } from './utils';

export const googleFinetuneRetrieveResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      return GoogleErrorResponseTransform(
        aiProviderResponseBody as unknown as GoogleErrorResponse,
      );
    }

    return googleToOpenAIFinetune(
      aiProviderResponseBody as unknown as GoogleFinetuneRecord,
    );
  };
