import type { GoogleBatchRecord } from '@server/ai-providers/google/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { RetrieveBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { GoogleToOpenAIBatch } from './utils';

export const googleRetrieveBatchResponseTransform: ResponseTransformFunction = (
  response,
  status,
) => {
  if (status !== 200) {
    return response as unknown as RetrieveBatchResponseBody;
  }

  return GoogleToOpenAIBatch(response as unknown as GoogleBatchRecord);
};
