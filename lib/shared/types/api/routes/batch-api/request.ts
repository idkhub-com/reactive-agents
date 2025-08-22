import { z } from 'zod';

/**
 * The parameters for creating a batch request.
 */
export const CreateBatchRequestBody = z.object({
  /** The ID of the uploaded file that contains the requests for the batch. */
  input_file_id: z.string(),
  /** The endpoint to be used for all requests in the batch. Currently /v1/chat/completions, /v1/embeddings, and /v1/completions are supported. */
  endpoint: z.enum([
    '/v1/chat/completions',
    '/v1/embeddings',
    '/v1/completions',
  ]),
  /** The time frame within which the batch should be processed. Currently only "24h" is supported. */
  completion_window: z.literal('24h'),
  /** Optional custom metadata for the batch. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type CreateBatchRequestBody = z.infer<typeof CreateBatchRequestBody>;

/**
 * The parameters for retrieving a batch.
 */
export const RetrieveBatchRequestBody = z.object({
  /** The ID of the batch to retrieve. */
  batch_id: z.string(),
});

export type RetrieveBatchRequestBody = z.infer<typeof RetrieveBatchRequestBody>;

/**
 * The parameters for listing batches.
 */
export const ListBatchesRequestBody = z.object({
  /** A cursor for use in pagination. after is an object ID that defines your place in the list. */
  after: z.string().optional(),
  /** A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 20. */
  limit: z.number().int().min(1).max(100).default(20).optional(),
});

export type ListBatchesRequestBody = z.infer<typeof ListBatchesRequestBody>;

/**
 * The parameters for cancelling a batch.
 */
export const CancelBatchRequestBody = z.object({
  /** The ID of the batch to cancel. */
  batch_id: z.string(),
});

export type CancelBatchRequestBody = z.infer<typeof CancelBatchRequestBody>;
