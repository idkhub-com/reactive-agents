import type {
  GoogleBatchRecord,
  GoogleListBatchesResponse,
} from '@server/ai-providers/google/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';
import { GoogleToOpenAIBatch } from './utils';

export const googleListBatchesResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
) => {
  if (responseStatus !== 200) {
    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.GOOGLE_VERTEX_AI,
    );
  }

  const batches =
    (response as { batchPredictionJobs: GoogleBatchRecord[] })
      .batchPredictionJobs ?? [];

  const objects = batches.map(GoogleToOpenAIBatch);

  return {
    data: objects,
    object: 'list',
    first_id: objects.at(0)?.id ?? '',
    last_id: objects.at(-1)?.id ?? '',
    has_more: !!(response as unknown as GoogleListBatchesResponse)
      ?.nextPageToken,
  };
};
