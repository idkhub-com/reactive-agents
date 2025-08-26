import { z } from 'zod';

/**
 * The status of a fine-tuning job.
 */
export enum FineTuningJobStatus {
  VALIDATING_FILES = 'validating_files',
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Error information for a fine-tuning job.
 */
export const FineTuningJobError = z.object({
  /** Machine-readable error code. */
  code: z.string(),
  /** Human-readable error message. */
  message: z.string(),
  /** The parameter that caused the error, if applicable. */
  param: z.string().nullable().optional(),
});

export type FineTuningJobError = z.infer<typeof FineTuningJobError>;

/**
 * The hyperparameters used for the fine-tuning job.
 */
export const FineTuningJobHyperparameters = z.object({
  /** Number of epochs to train the model for. */
  n_epochs: z.union([z.number().int(), z.literal('auto')]),
  /** Batch size used for training. */
  batch_size: z.union([z.number().int(), z.literal('auto')]).optional(),
  /** Learning rate multiplier used for training. */
  learning_rate_multiplier: z.union([z.number(), z.literal('auto')]).optional(),
});

export type FineTuningJobHyperparameters = z.infer<
  typeof FineTuningJobHyperparameters
>;

/**
 * Integration configuration for fine-tuning job.
 */
export const FineTuningJobIntegration = z.object({
  /** The type of integration. */
  type: z.literal('wandb'),
  /** The Weights and Biases integration configuration. */
  wandb: z.object({
    /** The name of the project that the new run will be created under. */
    project: z.string(),
    /** A display name to set for the run. */
    name: z.string().optional(),
    /** The entity to use for the run. */
    entity: z.string().optional(),
    /** A list of tags to be attached to the newly created run. */
    tags: z.array(z.string()).optional(),
  }),
});

export type FineTuningJobIntegration = z.infer<typeof FineTuningJobIntegration>;

/**
 * A fine-tuning job object.
 */
export const FineTuningJob = z.object({
  /** The object identifier, which can be referenced in the API endpoints. */
  id: z.string(),
  /** The object type, which is always "fine_tuning.job". */
  object: z.literal('fine_tuning.job'),
  /** The Unix timestamp (in seconds) for when the fine-tuning job was created. */
  created_at: z.number().transform((v) => {
    if (v.toString().length === 10) {
      return v * 1000;
    }
    return v;
  }),
  /** For fine-tuning jobs that have failed, this will contain more information on the cause of the failure. */
  error: FineTuningJobError.nullable().optional(),
  /** The name of the fine-tuned model that is being created. The value will be null if the fine-tuning job is still running. */
  fine_tuned_model: z.string().nullable().optional(),
  /** The Unix timestamp (in seconds) for when the fine-tuning job was finished. The value will be null if the fine-tuning job is still running. */
  finished_at: z.number().nullable().optional(),
  /** The hyperparameters used for the fine-tuning job. */
  hyperparameters: FineTuningJobHyperparameters,
  /** The base model that is being fine-tuned. */
  model: z.string(),
  /** The organization that owns the fine-tuning job. */
  organization_id: z.string().optional(),
  /** The compiled results file ID(s) for the fine-tuning job. You can retrieve the results with the Files API. */
  result_files: z.array(z.string()).optional(),
  /** The current status of the fine-tuning job. */
  status: z.enum(FineTuningJobStatus),
  /** The total number of billable tokens processed by this fine-tuning job. The value will be null if the fine-tuning job is still running. */
  trained_tokens: z.number().nullable().optional(),
  /** The file ID used for training. You can retrieve the training data with the Files API. */
  training_file: z.string(),
  /** The file ID used for validation. You can retrieve the validation results with the Files API. */
  validation_file: z.string().nullable().optional(),
  /** A list of integrations to enable for your fine-tuning job. */
  integrations: z.array(FineTuningJobIntegration).optional(),
  /** The seed used for the fine-tuning job. */
  seed: z.number().optional(),
  /** The Unix timestamp (in seconds) for when the fine-tuning job is estimated to finish. The value will be null if the fine-tuning job is not running. */
  estimated_finish: z.number().nullable().optional(),
  /** Set of 16 key-value pairs that can be attached to an object. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type FineTuningJob = z.infer<typeof FineTuningJob>;

/**
 * The type of fine-tuning event.
 */
export const FineTuningEventLevel = z.enum(['info', 'warn', 'error']);

export type FineTuningEventLevel = z.infer<typeof FineTuningEventLevel>;

/**
 * The type of fine-tuning event.
 */
export const FineTuningEventType = z.enum(['message', 'metrics']);

export type FineTuningEventType = z.infer<typeof FineTuningEventType>;

/**
 * Fine-tuning job event object.
 */
export const FineTuningEvent = z.object({
  /** The object identifier. */
  id: z.string(),
  /** The object type, which is always "fine_tuning.job.event". */
  object: z.literal('fine_tuning.job.event'),
  /** The Unix timestamp (in seconds) for when the event was created. */
  created_at: z.number(),
  /** The level of the event. */
  level: FineTuningEventLevel,
  /** The message of the event. */
  message: z.string(),
  /** The type of event. */
  type: FineTuningEventType,
  /** Metrics at the step number during the fine-tuning job. Use these numbers to understand if your training is going smoothly (loss should decrease, token accuracy should increase). */
  data: z.record(z.string(), z.unknown()).optional(),
});

export type FineTuningEvent = z.infer<typeof FineTuningEvent>;

/**
 * Metrics at a step during the fine-tuning job.
 */
export const FineTuningStepMetrics = z.object({
  /** The step number. */
  step: z.number(),
  /** The training loss at this step. */
  train_loss: z.number().optional(),
  /** The training token accuracy at this step. */
  train_mean_token_accuracy: z.number().optional(),
  /** The valid loss at this step. */
  valid_loss: z.number().optional(),
  /** The valid mean token accuracy at this step. */
  valid_mean_token_accuracy: z.number().optional(),
  /** The full valid loss at this step. */
  full_valid_loss: z.number().optional(),
  /** The full valid mean token accuracy at this step. */
  full_valid_mean_token_accuracy: z.number().optional(),
});

export type FineTuningStepMetrics = z.infer<typeof FineTuningStepMetrics>;

/**
 * Fine-tuning job checkpoint object.
 */
export const FineTuningCheckpoint = z.object({
  /** The checkpoint identifier, which can be referenced in the API endpoints. */
  id: z.string(),
  /** The object type, which is always "fine_tuning.job.checkpoint". */
  object: z.literal('fine_tuning.job.checkpoint'),
  /** The Unix timestamp (in seconds) for when the checkpoint was created. */
  created_at: z.number(),
  /** The name of the fine-tuned checkpoint model that is created. */
  fine_tuned_model_checkpoint: z.string(),
  /** The step number that the checkpoint was created at. */
  step_number: z.number(),
  /** Metrics at the step number during the fine-tuning job. */
  metrics: FineTuningStepMetrics,
  /** The name of the fine-tuning job that this checkpoint was created from. */
  fine_tuning_job_id: z.string(),
});

export type FineTuningCheckpoint = z.infer<typeof FineTuningCheckpoint>;

/**
 * List of fine-tuning job objects.
 */
export const FineTuningJobList = z.object({
  /** The object type, which is always "list". */
  object: z.literal('list'),
  /** Array of fine-tuning job objects. */
  data: z.array(FineTuningJob),
  /** The first_id if pagination is needed. */
  first_id: z.string().optional(),
  /** The last_id if pagination is needed. */
  last_id: z.string().optional(),
  /** True if there are more fine-tuning jobs available. */
  has_more: z.boolean(),
});

export type FineTuningJobList = z.infer<typeof FineTuningJobList>;

/**
 * List of fine-tuning event objects.
 */
export const FineTuningEventList = z.object({
  /** The object type, which is always "list". */
  object: z.literal('list'),
  /** Array of fine-tuning event objects. */
  data: z.array(FineTuningEvent),
  /** The first_id if pagination is needed. */
  first_id: z.string().optional(),
  /** The last_id if pagination is needed. */
  last_id: z.string().optional(),
  /** True if there are more fine-tuning events available. */
  has_more: z.boolean(),
});

export type FineTuningEventList = z.infer<typeof FineTuningEventList>;

/**
 * List of fine-tuning checkpoint objects.
 */
export const FineTuningCheckpointList = z.object({
  /** The object type, which is always "list". */
  object: z.literal('list'),
  /** Array of fine-tuning checkpoint objects. */
  data: z.array(FineTuningCheckpoint),
  /** The first_id if pagination is needed. */
  first_id: z.string().optional(),
  /** The last_id if pagination is needed. */
  last_id: z.string().optional(),
  /** True if there are more checkpoints available. */
  has_more: z.boolean(),
});

export type FineTuningCheckpointList = z.infer<typeof FineTuningCheckpointList>;

/**
 * Response for creating a fine-tuning job.
 */
export const CreateFineTuningJobResponseBody = FineTuningJob;

export type CreateFineTuningJobResponseBody = z.infer<
  typeof CreateFineTuningJobResponseBody
>;

/**
 * Response for retrieving a fine-tuning job.
 */
export const RetrieveFineTuningJobResponseBody = FineTuningJob;

export type RetrieveFineTuningJobResponseBody = z.infer<
  typeof RetrieveFineTuningJobResponseBody
>;

/**
 * Response for listing fine-tuning jobs.
 */
export const ListFineTuningJobsResponseBody = FineTuningJobList;

export type ListFineTuningJobsResponseBody = z.infer<
  typeof ListFineTuningJobsResponseBody
>;

/**
 * Response for cancelling a fine-tuning job.
 */
export const CancelFineTuningJobResponseBody = FineTuningJob;

export type CancelFineTuningJobResponseBody = z.infer<
  typeof CancelFineTuningJobResponseBody
>;

/**
 * Response for listing fine-tuning events.
 */
export const ListFineTuningEventsResponseBody = FineTuningEventList;

export type ListFineTuningEventsResponseBody = z.infer<
  typeof ListFineTuningEventsResponseBody
>;

/**
 * Response for listing fine-tuning checkpoints.
 */
export const ListFineTuningCheckpointsResponseBody = FineTuningCheckpointList;

export type ListFineTuningCheckpointsResponseBody = z.infer<
  typeof ListFineTuningCheckpointsResponseBody
>;
