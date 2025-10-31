import type { BedrockGetBatchResponse } from '@server/ai-providers/bedrock/types';
import { getOctetStreamToOctetStreamTransformer } from '@server/handlers/stream-handler-utils';
import type { AppContext } from '@server/types/hono';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request';
import type { ReactiveAgentsTarget } from '@shared/types/api/request/headers';
import { AIProvider } from '@shared/types/constants';
import bedrockAPIConfig from './api';
import { BedrockUploadFileResponseTransforms } from './upload-file-utils';

// Define a more specific type for the transform functions
type BedrockResponseTransformFunction = (modelOutput: {
  id: string;
}) => Record<string, unknown>;

const getModelProvider = (modelId: string): string => {
  let provider = '';
  if (modelId.includes('llama2')) provider = 'llama2';
  else if (modelId.includes('llama3')) provider = 'llama3';
  else if (modelId.includes('titan')) provider = 'titan';
  else if (modelId.includes('mistral')) provider = 'mistral';
  else if (modelId.includes('anthropic')) provider = 'anthropic';
  else if (modelId.includes('ai21')) provider = 'ai21';
  else if (modelId.includes('cohere')) provider = 'cohere';
  else throw new Error('Invalid model slug');
  return provider;
};

const getRowTransform = (
  modelId: string,
): ((row: Record<string, unknown>) => Record<string, unknown>) => {
  const provider = getModelProvider(modelId);
  return (row: Record<string, unknown>): Record<string, unknown> => {
    if (!row.modelOutput && row.error) {
      // Convert Error to Record<string, unknown> format
      if (row.error instanceof Error) {
        return {
          error: row.error.message,
          status: 'error',
        };
      }
      return row.error as Record<string, unknown>;
    }

    // Cast modelOutput to a type with the required properties
    const modelOutput = row.modelOutput as { id: string };

    // Cast the transform function to the correct type
    const transformFunction = BedrockUploadFileResponseTransforms[
      provider
    ] as BedrockResponseTransformFunction;
    const transformedResponse = transformFunction(modelOutput);
    transformedResponse.model = modelId;

    return {
      id: modelOutput.id,
      custom_id: row.recordId as string,
      response: {
        status_code: 200,
        request_id: modelOutput.id,
        body: transformedResponse,
      },
      error: null,
    };
  };
};

export const bedrockGetBatchOutputRequestHandler = async ({
  c,
  raTarget,
  raRequestData,
}: {
  c: AppContext;
  raTarget: ReactiveAgentsTarget;
  raRequestData: ReactiveAgentsRequestData;
}): Promise<Response> => {
  try {
    // get s3 file id from batch details
    // get file from s3
    const baseUrl = bedrockAPIConfig.getBaseURL({
      c,
      raTarget,
      raRequestData,
    });
    const batchId = raRequestData.url
      .split('/v1/batches/')[1]
      .replace('/output', '');
    const retrieveBatchURL = `${baseUrl}/model-invocation-job/${batchId}`;
    const retrieveBatchesHeaders = await bedrockAPIConfig.headers({
      c,
      raTarget,
      raRequestData,
    });
    const retrieveBatchesResponse = await fetch(retrieveBatchURL, {
      method: 'GET',
      headers: retrieveBatchesHeaders as HeadersInit,
    });

    const batchDetails: BedrockGetBatchResponse =
      await retrieveBatchesResponse.json();
    const outputFileId = batchDetails.outputDataConfig.s3OutputDataConfig.s3Uri;

    const { aws_region } = raTarget;
    const awsS3Bucket = outputFileId.replace('s3://', '').split('/')[0];
    const jobId = batchDetails.jobArn.split('/')[1];
    const inputS3URIParts =
      batchDetails.inputDataConfig.s3InputDataConfig.s3Uri.split('/');

    const primaryKey = outputFileId?.replace(`s3://${awsS3Bucket}/`, '') ?? '';

    const awsS3ObjectKey = `${primaryKey}${jobId}/${inputS3URIParts[inputS3URIParts.length - 1]}.out`;
    const awsModelProvider = batchDetails.modelId;

    const s3FileURL = `https://${awsS3Bucket}.s3.${aws_region}.amazonaws.com/${awsS3ObjectKey}`;
    const s3FileHeaders = await bedrockAPIConfig.headers({
      c,
      raTarget,
      raRequestData,
    });
    const s3FileResponse = await fetch(s3FileURL, {
      method: 'GET',
      headers: s3FileHeaders as HeadersInit,
    });
    let responseStream: ReadableStream;
    if (
      s3FileResponse.headers.get('content-type')?.includes('octet-stream') &&
      s3FileResponse?.body
    ) {
      responseStream = s3FileResponse?.body?.pipeThrough(
        getOctetStreamToOctetStreamTransformer(
          getRowTransform(awsModelProvider),
        ),
      );
      return new Response(responseStream, {
        headers: {
          'content-type': 'application/octet-stream',
        },
      });
    } else {
      const body = await s3FileResponse.text();
      throw new Error(body);
    }
  } catch (error: unknown) {
    let errorResponse: Record<string, unknown> & { provider?: string };

    try {
      errorResponse = JSON.parse((error as Error).message);
      errorResponse.provider = AIProvider.BEDROCK;
    } catch (_e) {
      errorResponse = {
        error: {
          message: (error as Error).message,
          type: null,
          param: null,
          code: 500,
        },
        provider: AIProvider.BEDROCK,
      };
    }
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// export const bedrockGetBatchOutputResponseTransform: ResponseTransformFunction =
//   (aiProviderResponseBody, aiProviderResponseStatus) => {
//     if (aiProviderResponseStatus !== 200) {
//       const errorResponse = bedrockErrorResponseTransform(
//         aiProviderResponseBody,
//       );
//       if (errorResponse) return errorResponse;
//     }
//     return aiProviderResponseBody as unknown as GetBatchOutputResponseBody;
//   }; // TODO: Add this back in when we have a way to handle the response
