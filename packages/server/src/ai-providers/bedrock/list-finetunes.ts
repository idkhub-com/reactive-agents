import type { BedrockFinetuneRecord } from '@server/ai-providers/bedrock/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type {
  FineTuningJob,
  ListFineTuningJobsResponseBody,
} from '@shared/types/api/routes/fine-tuning-api';
import { bedrockErrorResponseTransform } from './chat-complete';
import { bedrockFinetuneToOpenAI } from './utils';

export const bedrockListFinetuneResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
) => {
  if (responseStatus !== 200) {
    const error = bedrockErrorResponseTransform(response);
    if (error) {
      return error;
    }
  }
  const records =
    ((response as { modelCustomizationJobSummaries?: unknown })
      .modelCustomizationJobSummaries as BedrockFinetuneRecord[]) || [];
  const openaiRecords = records.map(bedrockFinetuneToOpenAI);
  const listResponseBody: ListFineTuningJobsResponseBody = {
    data: openaiRecords as unknown as FineTuningJob[],
    object: 'list',
    last_id: (response as { nextToken?: string })?.nextToken,
    has_more: (response as { nextToken?: string })?.nextToken !== undefined,
  };
  return listResponseBody;
};
