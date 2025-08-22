import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type {
  Batch,
  BatchStatus,
  ListBatchesResponseBody,
} from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { bedrockErrorResponseTransform } from './chat-complete';

export const bedrockListBatchesResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = bedrockErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) {
      return errorResponse;
    }
  }

  if ('invocationJobSummaries' in aiProviderResponseBody) {
    const invocationJobSummaries =
      aiProviderResponseBody.invocationJobSummaries as Record<
        string,
        unknown
      >[];

    const batches = invocationJobSummaries.map((rawBatch) => {
      const inputDataConfig = rawBatch.inputDataConfig as unknown as {
        s3InputDataConfig: {
          s3Uri: string;
        };
      };
      const outputDataConfig = rawBatch.outputDataConfig as unknown as {
        s3OutputDataConfig: {
          s3Uri: string;
        };
      };
      const batch: Batch = {
        id: encodeURIComponent(rawBatch.jobArn as string),
        object: 'batch',
        created_at: new Date(rawBatch.submitTime as string).getTime(),
        status: rawBatch.status as BatchStatus,
        input_file_id: encodeURIComponent(
          inputDataConfig.s3InputDataConfig.s3Uri,
        ),
        output_file_id: encodeURIComponent(
          outputDataConfig.s3OutputDataConfig.s3Uri,
        ),
        finalizing_at: rawBatch.endTime
          ? new Date(rawBatch.endTime as string).getTime()
          : undefined,
        expires_at: rawBatch.jobExpirationTime
          ? new Date(rawBatch.jobExpirationTime as string).getTime()
          : undefined,
        endpoint: rawBatch.endpoint as string,
        request_counts: {
          total: rawBatch.requestCount as number,
          completed: rawBatch.completedCount as number,
          failed: rawBatch.failedCount as number,
        },
        metadata: rawBatch.metadata as Record<string, string>,
      };
      return batch;
    });

    const listResponseBody: ListBatchesResponseBody = {
      data: batches,
      object: 'list',
      last_id: (aiProviderResponseBody as { nextToken?: string })?.nextToken,
      has_more:
        (aiProviderResponseBody as { nextToken?: string })?.nextToken !==
        undefined,
    };
    return listResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.BEDROCK,
  );
};
