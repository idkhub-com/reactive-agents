import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { CancelBatchResponseBody } from '@shared/types/api/routes/batch-api';

export const googleCancelBatchResponseTransform: ResponseTransformFunction = (
  response,
) => {
  return response as unknown as CancelBatchResponseBody;
};
