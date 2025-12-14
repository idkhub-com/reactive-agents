import type { FireworksFile } from '@server/ai-providers/fireworks-ai/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { FileErrorResponseBody } from '@shared/types/api/routes/files-api';
import { fireworksDatasetToOpenAIFile } from './utils';

export const fireworksFileRetrieveResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus === 200) {
      return fireworksDatasetToOpenAIFile(
        aiProviderResponseBody as unknown as FireworksFile,
      );
    }
    return aiProviderResponseBody as unknown as FileErrorResponseBody;
  };
