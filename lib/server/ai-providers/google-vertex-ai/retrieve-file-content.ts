import type { GoogleErrorResponse } from '@server/ai-providers/google/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { FileContentResponseBody } from '@shared/types/api/routes/files-api';
import { GoogleErrorResponseTransform } from './utils';

export const googleRetrieveFileContentResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      return GoogleErrorResponseTransform(
        aiProviderResponseBody as unknown as GoogleErrorResponse,
      );
    }
    return aiProviderResponseBody as unknown as FileContentResponseBody;
  };
