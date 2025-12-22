import {
  ChatCompletionMessage,
  ChatCompletionThinking,
} from '@shared/types/api/routes/shared/messages';
import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import {
  ChatCompletionTool,
  ChatCompletionToolChoice,
  ChatCompletionToolFunction,
} from '@shared/types/api/routes/shared/tools';
import { z } from 'zod';

/**
 * The parameters for the chat completions API request.
 * Used for the /v1/chat/completions endpoint.
 */
export const ChatCompletionRequestBody = z.object({
  /** ID of the model to use. */
  model: z.string(),
  /** A list of messages comprising the conversation so far. */
  messages: z.array(ChatCompletionMessage),
  /** @deprecated Use tools instead. A list of functions the model may generate JSON inputs for. */
  functions: z.array(ChatCompletionToolFunction).optional(),
  /** @deprecated Use tool_choice instead. Controls which function is called by the model. */
  function_call: z
    .union([
      z.literal('none'),
      z.literal('auto'),
      z.object({ name: z.string() }),
    ])
    .optional(),
  /** The maximum number of tokens that can be generated in the chat completion. */
  max_tokens: z.number().optional(),
  /** An alternative to max_tokens for compatibility. */
  max_completion_tokens: z.number().optional(),
  /** What sampling temperature to use, between 0 and 2. */
  temperature: z.number().optional(),
  /** An alternative to sampling with temperature, called nucleus sampling. */
  top_p: z.number().optional(),
  /** How many chat completion choices to generate for each input message. */
  n: z.number().optional(),
  /** If set, partial message deltas will be sent. */
  stream: z.boolean().optional(),
  /** Up to 4 sequences where the API will stop generating further tokens. */
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  /** Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far. */
  presence_penalty: z.number().optional(),
  /** Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far. */
  frequency_penalty: z.number().optional(),
  /** Modify the likelihood of specified tokens appearing in the completion. */
  logit_bias: z.record(z.string(), z.number()).optional(),
  /** A unique identifier representing your end-user. */
  user: z.string().optional(),
  /** A list of tools the model may call. */
  tools: z.array(ChatCompletionTool).optional(),
  /** Controls which (if any) tool is called by the model. */
  tool_choice: ChatCompletionToolChoice.optional(),
  /** Controls the effort level of the reasoning process. One of minimal, low, medium, or high. */
  reasoning_effort: z.enum(ReasoningEffort).optional(),
  /** An object specifying the format that the model must output. */
  response_format: z
    .object({
      type: z.union([
        z.literal('json_object'),
        z.literal('text'),
        z.literal('json_schema'),
      ]),
      json_schema: z.any().optional(),
    })
    .optional(),
  /** This feature is in Beta. If specified, our system will make a best effort to sample deterministically. */
  seed: z.number().optional(),
  /** Whether or not to store the output of this chat completion request for use in our model distillation or evals products. */
  store: z.boolean().optional(),
  /** Developer-defined tags and values used for filtering completions in the dashboard. */
  metadata: z.any().optional(),
  /** Output types that you would like the model to generate for this request. */
  modalities: z.array(z.string()).optional(),
  /** Parameters for audio output. Required when audio output is requested. */
  audio: z
    .object({
      voice: z.string(),
      format: z.string(),
    })
    .optional(),
  /** Specifies the latency tier to use for processing the request. */
  service_tier: z.string().optional(),
  /** Configuration for specifying how the model should use the provided prediction content. */
  prediction: z
    .object({
      type: z.string(),
      content: z.union([
        z.object({
          type: z.string(),
          text: z.string(),
        }),
        z.string(),
      ]),
    })
    .optional(),
  /** Whether to return log probabilities of the output tokens or not. */
  logprobs: z.boolean().optional(),
  /** An integer between 0 and 20 specifying the number of most likely tokens to return at each token position. */
  top_logprobs: z.number().optional(),
  /** Whether to enable parallel function calling during tool use. */
  parallel_tool_calls: z.boolean().optional(),
  // Provider-specific parameters
  /** Google Vertex AI specific safety settings. */
  safety_settings: z.any().optional(),
  /** Anthropic specific beta features. */
  anthropic_beta: z.string().optional(),
  /** Anthropic specific version. */
  anthropic_version: z.string().optional(),
  /** Anthropic specific thinking configuration. */
  thinking: ChatCompletionThinking.optional(),
});

export type ChatCompletionRequestBody = z.infer<
  typeof ChatCompletionRequestBody
>;
