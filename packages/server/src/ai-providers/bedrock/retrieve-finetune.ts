import type { BedrockFinetuneRecord } from '@server/ai-providers/bedrock/types';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type { CreateFineTuningJobResponseBody } from '@shared/types/api/routes/fine-tuning-api';
import { bedrockErrorResponseTransform } from './chat-complete';
import { bedrockFinetuneToOpenAI } from './utils';

export const bedrockFinetuneResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
) => {
  if (responseStatus !== 200) {
    const error = bedrockErrorResponseTransform(response);
    if (error) {
      return error;
    }
  }

  return bedrockFinetuneToOpenAI(
    response as unknown as BedrockFinetuneRecord,
  ) as unknown as CreateFineTuningJobResponseBody | ErrorResponseBody;
};
