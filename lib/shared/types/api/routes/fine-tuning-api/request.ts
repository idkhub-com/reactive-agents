import { z } from 'zod';

/**
 * The hyperparameters used for the fine-tuning job.
 */
export const Hyperparameters = z.object({
  /** Number of epochs to train the model for. An epoch refers to one full cycle through the training dataset. */
  n_epochs: z.union([z.number().int().min(1).max(50), z.literal('auto')]),
  /** Batch size to use for training. The batch size is the number of training examples used to train a single forward and backward pass. */
  batch_size: z.union([z.number().int().min(1), z.literal('auto')]).optional(),
  /** Learning rate multiplier to use for training. */
  learning_rate_multiplier: z
    .union([z.number().positive(), z.literal('auto')])
    .optional(),
});

export type Hyperparameters = z.infer<typeof Hyperparameters>;

/**
 * Integration configuration for fine-tuning job.
 */
export const Integration = z.object({
  /** The type of integration to enable. Currently only "wandb" (Weights and Biases) is supported. */
  type: z.literal('wandb'),
  /** The Weights and Biases integration configuration. */
  wandb: z.object({
    /** The name of the project that the new run will be created under. */
    project: z.string(),
    /** A display name to set for the run. If not set, we will use the Job ID as the name. */
    name: z.string().optional(),
    /** The entity to use for the run. This allows you to set the team or username of the WandB user that you would like associated with the run. */
    entity: z.string().optional(),
    /** A list of tags to be attached to the newly created run. */
    tags: z.array(z.string()).optional(),
  }),
});

export type Integration = z.infer<typeof Integration>;

/**
 * The parameters for creating a fine-tuning job.
 */
export const CreateFineTuningJobRequestBody = z.object({
  /** The name of the model to fine-tune. You can select one of the supported models. */
  model: z.string(),
  /** The ID of an uploaded file that contains training data. */
  training_file: z.string(),
  /** The hyperparameters used for the fine-tuning job. */
  hyperparameters: Hyperparameters.optional(),
  /** A string of up to 18 characters that will be added to your fine-tuned model name. */
  suffix: z.string().max(18).optional(),
  /** The ID of an uploaded file that contains validation data. */
  validation_file: z.string().optional(),
  /** A list of integrations to enable for your fine-tuning job. */
  integrations: z.array(Integration).optional(),
  /** The seed controls the reproducibility of the job. */
  seed: z.number().int().optional(),
  /** Set of 16 key-value pairs that can be attached to an object. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type CreateFineTuningJobRequestBody = z.infer<
  typeof CreateFineTuningJobRequestBody
>;

/**
 * The parameters for retrieving a fine-tuning job.
 */
export const RetrieveFineTuningJobRequestBody = z.object({
  /** The ID of the fine-tuning job. */
  fine_tuning_job_id: z.string(),
});

export type RetrieveFineTuningJobRequestBody = z.infer<
  typeof RetrieveFineTuningJobRequestBody
>;

/**
 * The parameters for listing fine-tuning jobs.
 */
export const ListFineTuningJobsRequestBody = z.object({
  /** Identifier for the last job from the previous pagination request. */
  after: z.string().optional(),
  /** Number of fine-tuning jobs to retrieve. */
  limit: z.number().int().min(1).max(100).default(20).optional(),
});

export type ListFineTuningJobsRequestBody = z.infer<
  typeof ListFineTuningJobsRequestBody
>;

/**
 * The parameters for cancelling a fine-tuning job.
 */
export const CancelFineTuningJobRequestBody = z.object({
  /** The ID of the fine-tuning job to cancel. */
  fine_tuning_job_id: z.string(),
});

export type CancelFineTuningJobRequestBody = z.infer<
  typeof CancelFineTuningJobRequestBody
>;

/**
 * The parameters for listing fine-tuning events.
 */
export const ListFineTuningEventsRequestBody = z.object({
  /** The ID of the fine-tuning job to get events for. */
  fine_tuning_job_id: z.string(),
  /** Identifier for the last event from the previous pagination request. */
  after: z.string().optional(),
  /** Number of events to retrieve. */
  limit: z.number().int().min(1).max(100).default(20).optional(),
});

export type ListFineTuningEventsRequestBody = z.infer<
  typeof ListFineTuningEventsRequestBody
>;

/**
 * The parameters for listing fine-tuning checkpoints.
 */
export const ListFineTuningCheckpointsRequestBody = z.object({
  /** The ID of the fine-tuning job to get checkpoints for. */
  fine_tuning_job_id: z.string(),
  /** Identifier for the last checkpoint ID from the previous pagination request. */
  after: z.string().optional(),
  /** Number of checkpoints to retrieve. */
  limit: z.number().int().min(1).max(100).default(10).optional(),
});

export type ListFineTuningCheckpointsRequestBody = z.infer<
  typeof ListFineTuningCheckpointsRequestBody
>;
