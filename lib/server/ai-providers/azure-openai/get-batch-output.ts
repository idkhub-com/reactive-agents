import type { RequestHandlerFunction } from '@shared/types/ai-providers/config';
import type { RetrieveBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { azureOpenAIAPIConfig } from './api';

// Return a ReadableStream containing batches output data
export const azureOpenAIGetBatchOutputRequestHandler: RequestHandlerFunction =
  async ({ c, raTarget, raRequestData }) => {
    // get batch details which has output file id
    // get file content as ReadableStream
    // return file content

    // TODO: Fix this whole thing

    const baseUrl = azureOpenAIAPIConfig.getBaseURL({
      c,
      raTarget,
      raRequestData,
    });
    const retrieveBatchURL =
      baseUrl +
      azureOpenAIAPIConfig.getEndpoint({
        c,
        raTarget,
        raRequestData,
      });
    const retrieveBatchesHeaders = await azureOpenAIAPIConfig.headers({
      c,
      raTarget,
      raRequestData,
    });
    const retrieveBatchesResponse = await fetch(retrieveBatchURL, {
      method: 'GET',
      headers: retrieveBatchesHeaders,
    });

    const batchDetails: RetrieveBatchResponseBody =
      await retrieveBatchesResponse.json();

    const outputFileId = batchDetails.output_file_id;
    if (!outputFileId) {
      const errors = batchDetails.errors;
      if (errors) {
        return new Response(JSON.stringify(errors), {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({ error: 'No output file ID found' }),
        {
          status: 404,
        },
      );
    }

    const retrieveFileContentURL =
      baseUrl +
      azureOpenAIAPIConfig.getEndpoint({
        c,
        raTarget,
        raRequestData,
      });
    const retrieveFileContentHeaders = await azureOpenAIAPIConfig.headers({
      c,
      raTarget,
      raRequestData,
    });
    const response = fetch(retrieveFileContentURL, {
      method: 'GET',
      headers: retrieveFileContentHeaders,
    });
    return response;
  };
