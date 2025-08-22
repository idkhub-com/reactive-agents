import type {
  GoogleErrorResponse,
  GoogleFinetuneRecord,
  GoogleListFinetuneJobsResponse,
} from '@server/ai-providers/google/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import { GoogleErrorResponseTransform, googleToOpenAIFinetune } from './utils';

export const googleFinetuneListResponseTransform: ResponseTransformFunction = (
  input,
  status,
) => {
  if (status !== 200) {
    return GoogleErrorResponseTransform(
      input as unknown as GoogleErrorResponse,
    );
  }
  const records =
    (input as unknown as { tuningJobs: GoogleFinetuneRecord[] }).tuningJobs ??
    [];

  const objects = records.map(googleToOpenAIFinetune);

  return {
    data: objects,
    object: 'list',
    first_id: objects.at(0)?.id ?? '',
    last_id: objects.at(-1)?.id ?? '',
    has_more: !!(input as unknown as GoogleListFinetuneJobsResponse)
      ?.nextPageToken,
  };
};
