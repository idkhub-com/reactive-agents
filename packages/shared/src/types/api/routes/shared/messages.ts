import { z } from 'zod';
import { ChatCompletionToolCall } from './tools';

export enum ChatCompletionMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
  TOOL = 'tool',
  DEVELOPER = 'developer',
}

export const PrettyChatCompletionMessageRole: Record<
  ChatCompletionMessageRole | 'reasoning',
  string
> = {
  [ChatCompletionMessageRole.USER]: 'User',
  [ChatCompletionMessageRole.ASSISTANT]: 'Assistant',
  [ChatCompletionMessageRole.FUNCTION]: 'Tool',
  [ChatCompletionMessageRole.TOOL]: 'Tool',
  [ChatCompletionMessageRole.DEVELOPER]: 'Developer',
  [ChatCompletionMessageRole.SYSTEM]: 'System',
  reasoning: 'Reasoning',
};

export const ChatCompletionSystemMessageRoles = [
  ChatCompletionMessageRole.SYSTEM,
  ChatCompletionMessageRole.DEVELOPER,
];

export const ChatCompletionToolMessageRoles = [
  ChatCompletionMessageRole.TOOL,
  ChatCompletionMessageRole.FUNCTION,
];

export const ChatCompletionThinking = z.object({
  type: z.string(),
  budget_tokens: z.number(),
});

export type ChatCompletionThinking = z.infer<typeof ChatCompletionThinking>;

/**
 * A message content type.
 */
export const ChatCompletionContentType = z.object({
  cache_control: z.object({ type: z.literal('ephemeral') }).optional(),
  type: z.string().optional(),
  text: z.string().optional(),
  thinking: z.string().optional(),
  signature: z.string().optional(),
  image_url: z
    .object({
      url: z.string(),
      detail: z.string().optional(),
      mime_type: z.string().optional(),
    })
    .optional(),
  data: z.string().optional(),
  file: z
    .object({
      file_data: z.string().optional(),
      file_id: z.string().optional(),
      file_name: z.string().optional(),
      file_url: z.string().optional(),
      mime_type: z.string().optional(),
    })
    .optional(),
  input_audio: z
    .object({
      data: z.string(),
      format: z.string().optional(), //defaults to auto
    })
    .optional(),
});

export type ChatCompletionContentType = z.infer<
  typeof ChatCompletionContentType
>;

export const ChatCompletionContentBlockChunk = ChatCompletionContentType.extend(
  {
    index: z.number(),
    type: z.string().optional(),
  },
);

export type ChatCompletionContentBlockChunk = z.infer<
  typeof ChatCompletionContentBlockChunk
>;

/**
 * A message in the conversation.
 */
export const ChatCompletionMessage = z.object({
  /** The role of the message sender. It can be 'system', 'user', 'assistant', or 'function'. */
  role: z.enum(ChatCompletionMessageRole),
  /** The content of the message. */
  content: z
    .union([z.string(), z.array(ChatCompletionContentType)])
    .nullable()
    .optional(),
  /** The content blocks of the message. */
  content_blocks: z.array(ChatCompletionContentType).optional(),
  /** The name of the function to call, if any. */
  name: z.string().optional(),
  /** The function call to make, if any. */
  function_call: z.any().optional(),
  tool_calls: z.array(ChatCompletionToolCall).optional(),
  tool_call_id: z.string().optional(),
  citation_metadata: z.any().optional(),
});

export type ChatCompletionMessage = z.infer<typeof ChatCompletionMessage>;

export const ChatCompletionExamples = z.object({
  input: ChatCompletionMessage.optional(),
  output: ChatCompletionMessage.optional(),
});

export type ChatCompletionExamples = z.infer<typeof ChatCompletionExamples>;
