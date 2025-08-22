import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import { toSnakeCase } from '@server/utils/misc';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type {
  BatchStatus,
  CreateBatchResponseBody,
} from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { bedrockErrorResponseTransform } from './chat-complete';

export const bedrockRetrieveBatchResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(
        aiProviderResponseBody,
      );
      if (errorResponse) {
        return errorResponse;
      }
    }

    if ('jobArn' in aiProviderResponseBody) {
      const inputDataConfig =
        aiProviderResponseBody.inputDataConfig as unknown as {
          s3InputDataConfig: {
            s3Uri: string;
          };
        };

      const outputDataConfig =
        aiProviderResponseBody.outputDataConfig as unknown as {
          s3OutputDataConfig: {
            s3Uri: string;
          };
        };

      const batchResponseBody: CreateBatchResponseBody = {
        id: encodeURIComponent(aiProviderResponseBody.jobArn as string),
        object: 'batch',
        created_at: new Date(
          aiProviderResponseBody.submitTime as string,
        ).getTime(),
        status: toSnakeCase(
          aiProviderResponseBody.status as string,
        ) as BatchStatus,
        input_file_id: encodeURIComponent(
          inputDataConfig.s3InputDataConfig.s3Uri as string,
        ),
        output_file_id: encodeURIComponent(
          outputDataConfig.s3OutputDataConfig.s3Uri as string,
        ),
        finalizing_at: new Date(
          aiProviderResponseBody.endTime as string,
        ).getTime(),
        expires_at: new Date(
          aiProviderResponseBody.jobExpirationTime as string,
        ).getTime(),
        ...((aiProviderResponseBody.message as string) && {
          errors: {
            object: 'list',
            data: [
              {
                // Static to `failed`
                code: 'failed',
                message: aiProviderResponseBody.message as string,
              },
            ],
          },
          failed_at: new Date(
            aiProviderResponseBody.lastModifiedTime as string,
          ).getTime(),
        }),
        metadata: aiProviderResponseBody.metadata as Record<string, string>,
        endpoint: aiProviderResponseBody.endpoint as string,
        request_counts: {
          total: aiProviderResponseBody.requestCount as number,
          completed: aiProviderResponseBody.completedCount as number,
          failed: aiProviderResponseBody.failedCount as number,
        },
      };
      return batchResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };
