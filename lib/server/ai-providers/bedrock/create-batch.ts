import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ParameterConfigDefaultFunction } from '@shared/types/api/response/body';
import type {
  CreateBatchRequestBody,
  CreateBatchResponseBody,
} from '@shared/types/api/routes/batch-api';
import { BatchStatus } from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { bedrockErrorResponseTransform } from './chat-complete';

export const BedrockCreateBatchConfig: AIProviderFunctionConfig = {
  model: {
    param: 'modelId',
    required: true,
  },
  input_file_id: {
    param: 'inputDataConfig',
    required: true,
    transform: (raRequestBody: CreateBatchRequestBody) => {
      return {
        s3InputDataConfig: {
          s3Uri: decodeURIComponent(raRequestBody.input_file_id),
        },
      };
    },
  },
  job_name: {
    param: 'jobName',
    required: true,
    default: () => {
      return `ra-batch-job-${crypto.randomUUID()}`;
    },
  },
  output_data_config: {
    param: 'outputDataConfig',
    required: true,
    default: (({ raRequestBody, raTarget }): Record<string, unknown> => {
      if (!('input_file_id' in raRequestBody)) {
        throw new Error('input_file_id is required');
      }

      // TODO: Fix this
      const inputFileId = decodeURIComponent(
        raRequestBody.input_file_id as string,
      );
      const s3URLToContainingFolder = `${inputFileId.split('/').slice(0, -1).join('/')}/`;
      return {
        s3OutputDataConfig: {
          s3Uri: s3URLToContainingFolder,
          ...(raTarget.aws_server_side_encryption_kms_key_id && {
            s3EncryptionKeyId: raTarget.aws_server_side_encryption_kms_key_id,
          }),
        } as Record<string, unknown>,
      };
    }) as ParameterConfigDefaultFunction,
  },
  role_arn: {
    param: 'roleArn',
    required: true,
  },
};

export const bedrockCreateBatchResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
) => {
  if (responseStatus !== 200) {
    const errorResponse = bedrockErrorResponseTransform(
      response as Record<string, unknown>,
    );
    if (errorResponse) return errorResponse;
  }

  if ('jobArn' in response) {
    // AWS Bedrock CreateModelInvocationJob returns a simple response with jobArn
    // We need to construct the OpenAI-compatible batch response
    const awsResponse = response as unknown as { jobArn: string };

    const batchResponseBody: CreateBatchResponseBody = {
      id: encodeURIComponent(awsResponse.jobArn),
      object: 'batch',
      endpoint: '/v1/chat/completions', // Default endpoint for batch operations
      input_file_id: '', // This will be populated from the original request context
      status: BatchStatus.VALIDATING, // Initial status for newly created batch
      output_file_id: null, // Will be available when batch completes
      error_file_id: null,
      created_at: Date.now(), // Use current time since AWS doesn't provide this in create response
      in_progress_at: null,
      expires_at: null,
      finalizing_at: null,
      completed_at: null,
      failed_at: null,
      expired_at: null,
      cancelling_at: null,
      cancelled_at: null,
      request_counts: {
        total: 0, // Unknown at creation time
        completed: 0,
        failed: 0,
      },
      completion_window: '24h', // Default completion window
      metadata: null,
    };

    return batchResponseBody;
  }

  return generateInvalidProviderResponseError(response, AIProvider.BEDROCK);
};
