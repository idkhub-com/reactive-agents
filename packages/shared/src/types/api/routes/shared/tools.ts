import z from 'zod';

/**
 * A function in the conversation.
 */
export const ChatCompletionToolFunction = z.object({
  /** The name of the function. */
  name: z.string(),
  /** A description of the function. */
  description: z.string().optional(),
  /** The parameters for the function. */
  parameters: z.record(z.string(), z.unknown()).optional(),
  /** Whether to enable strict schema adherence when generating the function call. If set to true, the model will follow the exact schema defined in the parameters field. Only a subset of JSON Schema is supported when strict is true */
  strict: z.boolean().optional(),
});

export type ChatCompletionToolFunction = z.infer<
  typeof ChatCompletionToolFunction
>;

export const ChatCompletionTool = z.object({
  cache_control: z.object({ type: z.literal('ephemeral') }).optional(),

  /** The name of the function. */
  type: z.string(),
  /** A description of the function. */
  function: ChatCompletionToolFunction,
});

export type ChatCompletionTool = z.infer<typeof ChatCompletionTool>;

export interface RawSchema {
  description: string;
  properties: Record<string, unknown>;
  additionalProperties: boolean;
  required: string[];
}

export const ChatCompletionToolCall = z.object({
  id: z.string(),
  type: z.string(),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

export type ChatCompletionToolCall = z.infer<typeof ChatCompletionToolCall>;

export const ChatCompletionToolChoiceObject = z.object({
  type: z.string(),
  function: z.object({
    name: z.string(),
  }),
});

export type ChatCompletionToolChoiceObject = z.infer<
  typeof ChatCompletionToolChoiceObject
>;

export const ChatCompletionToolChoice = z.union([
  ChatCompletionToolChoiceObject,
  z.literal('none'),
  z.literal('auto'),
  z.literal('required'),
]);

export type ChatCompletionToolChoice = z.infer<typeof ChatCompletionToolChoice>;
