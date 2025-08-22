import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { CancelBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { BatchStatus } from '@shared/types/api/routes/batch-api';
import { bedrockErrorResponseTransform } from './chat-complete';

export const bedrockCancelBatchResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = bedrockErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) return errorResponse;
  }
  const batchId = decodeURIComponent(
    idkRequestData.url.split('/v1/batches/')[1].split('/')[0],
  );
  const batchResponseBody: CancelBatchResponseBody = {
    id: batchId,
    status: BatchStatus.CANCELLED,
    object: 'batch',
    input_file_id: '',
    endpoint: '',
    created_at: 0,
    request_counts: {
      total: 0,
      completed: 0,
      failed: 0,
    },
    expires_at: 0,
    in_progress_at: 0,
    finalizing_at: 0,
    completed_at: 0,
    failed_at: 0,
    expired_at: 0,
    cancelling_at: 0,
    cancelled_at: 0,
  };
  return batchResponseBody;
};
