import { z } from 'zod';

/**
 * The parameters for the legacy completions API request.
 * Used for the /v1/completions endpoint.
 * @deprecated This endpoint is legacy and may be removed in future versions.
 */
export const CompletionRequestBody = z.object({
  /** ID of the model to use. */
  model: z.string(),
  /** The prompt(s) to generate completions for. */
  prompt: z.union([
    z.string(),
    z.array(z.string()),
    z.array(z.number()),
    z.array(z.array(z.number())),
  ]),
  /** The maximum number of tokens to generate in the completion. */
  max_tokens: z.number().optional(),
  /** What sampling temperature to use, between 0 and 2. */
  temperature: z.number().optional(),
  /** An alternative to sampling with temperature, called nucleus sampling. */
  top_p: z.number().optional(),
  /** How many completions to generate for each prompt. */
  n: z.number().optional(),
  /** Whether to stream back partial completions. */
  stream: z.boolean().optional(),
  /** Include the log probabilities on the logprobs most likely tokens. */
  logprobs: z.number().optional(),
  /** Whether to return log probabilities of the output tokens or not. */
  top_logprobs: z.boolean().optional(),
  /** Echo back the prompt in addition to the completion. */
  echo: z.boolean().optional(),
  /** Up to 4 sequences where the API will stop generating further tokens. */
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  /** Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far. */
  presence_penalty: z.number().optional(),
  /** Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far. */
  frequency_penalty: z.number().optional(),
  /** Generates best_of completions server-side and returns the "best". */
  best_of: z.number().optional(),
  /** Modify the likelihood of specified tokens appearing in the completion. */
  logit_bias: z.record(z.string(), z.number()).optional(),
  /** A unique identifier representing your end-user. */
  user: z.string().optional(),
  /** The suffix that comes after a completion of inserted text. */
  suffix: z.string().optional(),
  /** If specified, our system will make a best effort to sample deterministically. */
  seed: z.number().optional(),
});

export type CompletionRequestBody = z.infer<typeof CompletionRequestBody>;
