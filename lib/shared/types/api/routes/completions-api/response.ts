import { z } from 'zod';

/**
 * Log probability information for a token.
 */
export const CompletionTokenLogprob = z.object({
  /** The token. */
  token: z.string(),
  /** The log probability of this token. */
  logprob: z.number(),
  /** A list of integers representing the UTF-8 bytes representation of the token. */
  bytes: z.array(z.number()).optional(),
  /** List of the most likely tokens and their log probabilities at this token position. */
  top_logprobs: z
    .array(
      z.object({
        /** The token. */
        token: z.string(),
        /** The log probability of this token. */
        logprob: z.number(),
        /** A list of integers representing the UTF-8 bytes representation of the token. */
        bytes: z.array(z.number()).optional(),
      }),
    )
    .optional(),
});

export type CompletionTokenLogprob = z.infer<typeof CompletionTokenLogprob>;

/**
 * Log probability information for the choice.
 */
export const CompletionChoiceLogprobs = z.object({
  /** The tokens chosen by the completion endpoint. */
  tokens: z.array(z.string()).optional(),
  /** The log probabilities of the tokens chosen by the completion endpoint. */
  token_logprobs: z.array(z.number().nullable()).optional(),
  /** The most likely tokens at each position and their log probabilities. */
  top_logprobs: z.array(z.record(z.string(), z.number()).nullable()).optional(),
  /** The character offsets from the beginning of the returned text for each token. */
  text_offset: z.array(z.number()).optional(),
});

export type CompletionChoiceLogprobs = z.infer<typeof CompletionChoiceLogprobs>;

export enum CompletionFinishReason {
  STOP = 'stop',
  LENGTH = 'length',
  CONTENT_FILTER = 'content_filter',
}

/**
 * A completion choice.
 */
export const CompletionChoice = z.object({
  /** The reason the model stopped generating tokens. */
  finish_reason: z.nativeEnum(CompletionFinishReason).nullable(),
  /** The index of the choice in the list of choices. */
  index: z.number(),
  /** Log probability information for the choice. */
  logprobs: CompletionChoiceLogprobs.nullable(),
  /** The generated text completion. */
  text: z.string(),
});

export type CompletionChoice = z.infer<typeof CompletionChoice>;

/**
 * Usage statistics for the completion request.
 */
export const CompletionUsage = z.object({
  /** Number of tokens in the generated completion. */
  completion_tokens: z.number(),
  /** Number of tokens in the prompt. */
  prompt_tokens: z.number(),
  /** Total number of tokens used in the request (prompt + completion). */
  total_tokens: z.number(),
});

export type CompletionUsage = z.infer<typeof CompletionUsage>;

/**
 * Represents a completion response from the API.
 * Note: both the streamed and non-streamed response objects share the same shape (unlike the chat endpoint).
 */
export const CompletionResponseBody = z.object({
  /** A unique identifier for the completion. */
  id: z.string(),
  /** The list of completion choices the model generated for the input prompt. */
  choices: z.array(CompletionChoice),
  /** The Unix timestamp (in seconds) of when the completion was created. */
  created: z.number(),
  /** The model used for completion. */
  model: z.string(),
  /** The object type, which is always "text_completion". */
  object: z.literal('text_completion'),
  /** This fingerprint represents the backend configuration that the model runs with. */
  system_fingerprint: z.string().optional(),
  /** Usage statistics for the completion request. */
  usage: CompletionUsage.optional(),
});

export type CompletionResponseBody = z.infer<typeof CompletionResponseBody>;
