import { z } from 'zod';

/**
 * The status of a batch request.
 */
export enum BatchStatus {
  VALIDATING = 'validating',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLING = 'cancelling',
  CANCELLED = 'cancelled',
}

/**
 * Usage statistics for the batch request.
 */
export const BatchUsage = z.object({
  /** Number of tokens in the prompt. */
  prompt_tokens: z.number(),
  /** Number of tokens in the generated completion. */
  completion_tokens: z.number(),
  /** Total number of tokens used in the request (prompt + completion). */
  total_tokens: z.number(),
});

export type BatchUsage = z.infer<typeof BatchUsage>;

/**
 * Error information for a batch request.
 */
export const BatchError = z.object({
  /** Machine-readable error code. */
  code: z.string(),
  /** Human-readable error message. */
  message: z.string(),
  /** The parameter that caused the error, if applicable. */
  param: z.string().nullable().optional(),
  /** The type of error. */
  type: z.string().optional(),
});

export type BatchError = z.infer<typeof BatchError>;

/**
 * List of errors for the batch object.
 */
export const BatchErrors = z.object({
  /** The object type, which is always "list". */
  object: z.literal('list'),
  /** Array of error objects. */
  data: z.array(BatchError),
});

export type BatchErrors = z.infer<typeof BatchErrors>;

/**
 * Request counts for the batch.
 */
export const BatchRequestCounts = z.object({
  /** Total number of requests in the batch. */
  total: z.number(),
  /** Number of requests that have been completed successfully. */
  completed: z.number(),
  /** Number of requests that have failed. */
  failed: z.number(),
});

export type BatchRequestCounts = z.infer<typeof BatchRequestCounts>;

/**
 * A batch object representing a collection of API requests.
 */
export const Batch = z.object({
  /** The object identifier, which can be referenced in the API endpoints. */
  id: z.string(),
  /** The object type, which is always "batch". */
  object: z.literal('batch'),
  /** The endpoint to be used for all requests in the batch. */
  endpoint: z.string(),
  /** A list of errors that occurred during the processing of the batch. */
  errors: BatchErrors.optional(),
  /** The ID of the input file for the batch. */
  input_file_id: z.string(),
  /** The time frame within which the batch should be processed. */
  completion_window: z.string().nullable().optional(),
  /** The current status of the batch. */
  status: z.nativeEnum(BatchStatus),
  /** The ID of the file containing the outputs of successfully executed requests. */
  output_file_id: z.string().nullable().optional(),
  /** The ID of the file containing the outputs of requests with errors. */
  error_file_id: z.string().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch was created. */
  created_at: z.number(),
  /** The Unix timestamp (in seconds) for when the batch started processing. */
  in_progress_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch expires. */
  expires_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch started finalizing. */
  finalizing_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch was completed. */
  completed_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch failed. */
  failed_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch expired. */
  expired_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch started cancelling. */
  cancelling_at: z.number().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the batch was cancelled. */
  cancelled_at: z.number().nullable().optional(),
  /** The request counts for the batch. */
  request_counts: BatchRequestCounts,
  /** Set of 16 key-value pairs that can be attached to an object. */
  metadata: z.record(z.string(), z.string()).nullable().optional(),
});

export type Batch = z.infer<typeof Batch>;

/**
 * List of batch objects.
 */
export const BatchList = z.object({
  /** The object type, which is always "list". */
  object: z.literal('list'),
  /** Array of batch objects. */
  data: z.array(Batch),
  /** The ID of the first item in the list. */
  first_id: z.string().optional(),
  /** The ID of the last item in the list. */
  last_id: z.string().optional(),
  /** True if there are more items available. */
  has_more: z.boolean(),
});

export type BatchList = z.infer<typeof BatchList>;

/**
 * Response for creating a batch.
 */
export const CreateBatchResponseBody = Batch;

export type CreateBatchResponseBody = z.infer<typeof CreateBatchResponseBody>;

/**
 * Response for retrieving a batch.
 */
export const RetrieveBatchResponseBody = Batch;

export type RetrieveBatchResponseBody = z.infer<
  typeof RetrieveBatchResponseBody
>;

/**
 * Response for listing batches.
 */
export const ListBatchesResponseBody = BatchList;

export type ListBatchesResponseBody = z.infer<typeof ListBatchesResponseBody>;

/**
 * Response for cancelling a batch.
 */
export const CancelBatchResponseBody = Batch;

export type CancelBatchResponseBody = z.infer<typeof CancelBatchResponseBody>;
