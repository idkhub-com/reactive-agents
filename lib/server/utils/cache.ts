import type { AppContext } from '@server/types/hono';
import {
  type CommonRequestOptions,
  type CreateResponseOptions,
  createResponse,
} from '@server/utils/idkhub/responses';
import { FunctionName } from '@shared/types/api/request';
import { CacheStatus } from '@shared/types/middleware/cache';

export async function getCachedResponse(
  c: AppContext,
  commonRequestOptions: CommonRequestOptions,
  aiProviderRequestBody:
    | Record<string, unknown>
    | ReadableStream
    | FormData
    | ArrayBuffer,
): Promise<Response | undefined> {
  // Unsupported functions are not cached
  if (
    [
      FunctionName.UPLOAD_FILE,
      FunctionName.LIST_FILES,
      FunctionName.RETRIEVE_FILE,
      FunctionName.DELETE_FILE,
      FunctionName.RETRIEVE_FILE_CONTENT,
      FunctionName.CREATE_BATCH,
      FunctionName.GET_BATCH_OUTPUT,
      FunctionName.CANCEL_BATCH,
      FunctionName.LIST_BATCHES,
      FunctionName.GET_BATCH_OUTPUT,
      FunctionName.LIST_FINE_TUNING_JOBS,
      FunctionName.CREATE_FINE_TUNING_JOB,
      FunctionName.RETRIEVE_FINE_TUNING_JOB,
      FunctionName.CANCEL_FINE_TUNING_JOB,
    ].includes(commonRequestOptions.idkRequestData.functionName)
  ) {
    return;
  }

  const getAIProviderResponseFromCache = c.get(
    'getAIProviderResponseFromCache',
  );

  const cacheResult = await getAIProviderResponseFromCache(
    c,
    commonRequestOptions.cacheSettings,
    commonRequestOptions.idkRequestData,
  );

  if (
    cacheResult.status === CacheStatus.HIT ||
    cacheResult.status === CacheStatus.SEMANTIC_HIT
  ) {
    const cacheHandlerOptions: CreateResponseOptions = {
      response: new Response(cacheResult.value, {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
      responseTransformerFunctionName: undefined,
      cacheStatus: cacheResult.status,
      retryCount: undefined,
      cacheKey: cacheResult.key,
      aiProviderRequestBody,
      ...commonRequestOptions,
    };

    return createResponse(c, cacheHandlerOptions);
  }
}
