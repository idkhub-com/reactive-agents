import type { EmbeddingsStorageConnector } from '@server/types/connector';
import type { AppEnv } from '@server/types/hono';
import { generateEmbeddingForRequest } from '@server/utils/embeddings';
import { FunctionName } from '@shared/types/api/request';

import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

export const embeddingsMiddleware = (
  factory: Factory<AppEnv>,
  connector: EmbeddingsStorageConnector,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    c.set('embeddings_storage_connector', connector);

    const idkRequestData = c.get('idk_request_data');

    // Generate embeddings for specific endpoints
    if (
      idkRequestData &&
      (idkRequestData.functionName === FunctionName.CHAT_COMPLETE ||
        idkRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE ||
        idkRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE)
    ) {
      // The embedding will be saved with the log after the request is completed
      let embedding = null;
      try {
        embedding = await generateEmbeddingForRequest(idkRequestData);
      } catch {
        embedding = null;
      }
      c.set('embedding', embedding);
    }

    await next();
  });
