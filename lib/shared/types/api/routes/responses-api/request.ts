import { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { z } from 'zod';
import { ResponseTextConfig } from './response';

export const ResponsesTool = z.object({
  type: z.string(),
  function: z
    .object({
      name: z.string(),
      description: z.string().optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
      strict: z.boolean().optional(),
    })
    .optional(),
  // File search tool
  vector_store_ids: z.array(z.string()).optional(),
  filters: z.unknown().optional(),
  max_num_results: z.number().optional(),
  ranking_options: z
    .object({
      ranker: z
        .union([z.literal('auto'), z.literal('default-2024-11-15')])
        .optional(),
      score_threshold: z.number().optional(),
    })
    .optional(),
  // Computer tool
  display_height: z.number().optional(),
  display_width: z.number().optional(),
  environment: z
    .union([
      z.literal('mac'),
      z.literal('windows'),
      z.literal('ubuntu'),
      z.literal('browser'),
    ])
    .optional(),
  // Web search tool
  search_context_size: z
    .union([z.literal('low'), z.literal('medium'), z.literal('high')])
    .optional(),
  user_location: z
    .object({
      type: z.literal('approximate'),
      city: z.string().optional(),
      country: z.string().optional(),
      region: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  // Image generation tool
  partial_images: z.number().optional(),
  // MCP tool
  server_label: z.string().optional(),
  server_url: z.string().optional(),
  require_approval: z
    .union([z.literal('always'), z.literal('never')])
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type ResponsesTool = z.infer<typeof ResponsesTool>;

export const ResponsesRequestBody = z.object({
  input: z.union([z.string(), z.array(ChatCompletionMessage)]),
  model: z.string(),
  background: z.boolean().optional(),
  include: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  max_output_tokens: z.number().optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  modalities: z.array(z.string()).optional(),
  parallel_tool_calls: z.boolean().optional(),
  previous_response_id: z.string().optional(),
  reasoning: z
    .object({
      effort: z
        .union([z.literal('low'), z.literal('medium'), z.literal('high')])
        .optional(),
    })
    .optional(),
  reasoning_effort: z
    .union([z.literal('low'), z.literal('medium'), z.literal('high')])
    .optional(),
  store: z.boolean().optional(),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  /**
   * Configuration options for a text response from the model. Can be plain text or
   * structured JSON data. Learn more:
   *
   * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
   * - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
   */
  text: ResponseTextConfig.optional(),
  tool_choice: z
    .union([
      z.literal('none'),
      z.literal('auto'),
      z.literal('required'),
      z.object({
        type: z.string(),
        name: z.string().optional(),
      }),
    ])
    .optional(),
  tools: z.array(ResponsesTool).optional(),
  top_p: z.number().optional(),
  truncation: z.union([z.literal('auto'), z.literal('disabled')]).optional(),
  user: z.string().optional(),
});

export type ResponsesRequestBody = z.infer<typeof ResponsesRequestBody>;

export const ListResponsesRequestBody = z.object({
  after: z.string().optional(),
  before: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListResponsesRequestBody = z.infer<typeof ListResponsesRequestBody>;

export const ListResponseInputItemsRequestBody = z.object({
  after: z.string().optional(),
  before: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListResponseInputItemsRequestBody = z.infer<
  typeof ListResponseInputItemsRequestBody
>;

export const GetResponseRequestBody = z.object({
  include: z.array(z.string()).optional(),
});

export type GetResponseRequestBody = z.infer<typeof GetResponseRequestBody>;
