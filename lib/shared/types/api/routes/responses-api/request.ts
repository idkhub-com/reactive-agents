import { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { z } from 'zod';
import {
  McpApprovalRequest,
  McpCall,
  McpListTools,
  ResponsesAPIFunctionCall,
  ResponsesAPIOutputWithRefusal,
  ResponsesAPIReasoningOutput,
  ResponseTextConfig,
} from './response';

/**
 * A custom tool that processes input using a specified format. Learn more about
 * [custom tools](https://platform.openai.com/docs/guides/function-calling#custom-tools).
 */
export const CustomTool = z.object({
  /**
   * The name of the custom tool, used to identify it in tool calls.
   */
  name: z.string(),

  /**
   * The type of the custom tool. Always `custom`.
   */
  type: z.literal('custom'),

  /**
   * Optional description of the custom tool, used to provide more context.
   */
  description: z.string().optional(),

  /**
   * The input format for the custom tool. Default is unconstrained text.
   */
  format: z.unknown().optional(),
});

export type CustomTool = z.infer<typeof CustomTool>;

// Placeholder schemas for Shared types since they're not defined in the provided code
const ComparisonFilter = z.object({
  // Define based on your actual ComparisonFilter structure
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

const CompoundFilter = z.object({
  // Define based on your actual CompoundFilter structure
  type: z.union([z.literal('and'), z.literal('or')]),
  filters: z.array(z.unknown()),
});

/**
 * A tool that searches for relevant content from uploaded files. Learn more about
 * the
 * [file search tool](https://platform.openai.com/docs/guides/tools-file-search).
 */
export const FileSearchTool = z.object({
  /**
   * The type of the file search tool. Always `file_search`.
   */
  type: z.literal('file_search'),

  /**
   * The IDs of the vector stores to search.
   */
  vector_store_ids: z.array(z.string()),

  /**
   * A filter to apply.
   */
  filters: z.union([ComparisonFilter, CompoundFilter, z.null()]).optional(),

  /**
   * The maximum number of results to return. This number should be between 1 and 50
   * inclusive.
   */
  max_num_results: z.number().min(1).max(50).optional(),

  /**
   * Ranking options for search.
   */
  ranking_options: z
    .object({
      ranker: z
        .union([z.literal('auto'), z.literal('default-2024-11-15')])
        .optional(),
      score_threshold: z.number().optional(),
    })
    .optional(),
});

export type FileSearchTool = z.infer<typeof FileSearchTool>;

/**
 * A tool that allows the model to execute shell commands in a local environment.
 */
export const LocalShell = z.object({
  /**
   * The type of the local shell tool. Always `local_shell`.
   */
  type: z.literal('local_shell'),
});

export type LocalShell = z.infer<typeof LocalShell>;

/**
 * A tool that controls a virtual computer. Learn more about the
 * [computer tool](https://platform.openai.com/docs/guides/tools-computer-use).
 */
export const ComputerTool = z.object({
  /**
   * The height of the computer display.
   */
  display_height: z.number(),

  /**
   * The width of the computer display.
   */
  display_width: z.number(),

  /**
   * The type of computer environment to control.
   */
  environment: z.union([
    z.literal('windows'),
    z.literal('mac'),
    z.literal('linux'),
    z.literal('ubuntu'),
    z.literal('browser'),
  ]),

  /**
   * The type of the computer use tool. Always `computer_use_preview`.
   */
  type: z.literal('computer_use_preview'),
});

export type ComputerTool = z.infer<typeof ComputerTool>;

/**
 * The user's location.
 */
export const UserLocation = z.object({
  /**
   * The type of location approximation. Always `approximate`.
   */
  type: z.literal('approximate'),

  /**
   * Free text input for the city of the user, e.g. `San Francisco`.
   */
  city: z.string().nullable().optional(),

  /**
   * The two-letter [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1) of
   * the user, e.g. `US`.
   */
  country: z.string().nullable().optional(),

  /**
   * Free text input for the region of the user, e.g. `California`.
   */
  region: z.string().nullable().optional(),

  /**
   * The [IANA timezone](https://timeapi.io/documentation/iana-timezones) of the
   * user, e.g. `America/Los_Angeles`.
   */
  timezone: z.string().nullable().optional(),
});

export type UserLocation = z.infer<typeof UserLocation>;

/**
 * This tool searches the web for relevant results to use in a response. Learn more
 * about the
 * [web search tool](https://platform.openai.com/docs/guides/tools-web-search).
 */
export const WebSearchTool = z.object({
  /**
   * The type of the web search tool. One of `web_search_preview` or
   * `web_search_preview_2025_03_11`.
   */
  type: z.union([
    z.literal('web_search_preview'),
    z.literal('web_search_preview_2025_03_11'),
  ]),

  /**
   * High level guidance for the amount of context window space to use for the
   * search. One of `low`, `medium`, or `high`. `medium` is the default.
   */
  search_context_size: z
    .union([z.literal('low'), z.literal('medium'), z.literal('high')])
    .optional(),

  /**
   * The user's location.
   */
  user_location: UserLocation.nullable().optional(),
});

export type WebSearchTool = z.infer<typeof WebSearchTool>;

// Note: These types need to be defined since they were referenced in the interface
const McpToolFilter = z.object({
  // Define the structure based on your actual McpToolFilter type
  // This is a placeholder - adjust according to your actual type
  pattern: z.string().optional(),
  exclude: z.array(z.string()).optional(),
});

const McpToolApprovalFilter = z.object({
  // Define the structure based on your actual McpToolApprovalFilter type
  // This is a placeholder - adjust according to your actual type
  tools: z.array(z.string()).optional(),
  pattern: z.string().optional(),
});

export const Mcp = z.object({
  /**
   * A label for this MCP server, used to identify it in tool calls.
   */
  server_label: z.string(),

  /**
   * The type of the MCP tool. Always `mcp`.
   */
  type: z.literal('mcp'),

  /**
   * List of allowed tool names or a filter object.
   */
  allowed_tools: z
    .union([z.array(z.string()), McpToolFilter, z.null()])
    .optional(),

  /**
   * An OAuth access token that can be used with a remote MCP server, either with a
   * custom MCP server URL or a service connector. Your application must handle the
   * OAuth authorization flow and provide the token here.
   */
  authorization: z.string().optional(),

  /**
   * Identifier for service connectors, like those available in ChatGPT. One of
   * `server_url` or `connector_id` must be provided. Learn more about service
   * connectors
   * [here](https://platform.openai.com/docs/guides/tools-remote-mcp#connectors).
   *
   * Currently supported `connector_id` values are:
   *
   * - Dropbox: `connector_dropbox`
   * - Gmail: `connector_gmail`
   * - Google Calendar: `connector_googlecalendar`
   * - Google Drive: `connector_googledrive`
   * - Microsoft Teams: `connector_microsoftteams`
   * - Outlook Calendar: `connector_outlookcalendar`
   * - Outlook Email: `connector_outlookemail`
   * - SharePoint: `connector_sharepoint`
   */
  connector_id: z
    .union([
      z.literal('connector_dropbox'),
      z.literal('connector_gmail'),
      z.literal('connector_googlecalendar'),
      z.literal('connector_googledrive'),
      z.literal('connector_microsoftteams'),
      z.literal('connector_outlookcalendar'),
      z.literal('connector_outlookemail'),
      z.literal('connector_sharepoint'),
    ])
    .optional(),

  /**
   * Optional HTTP headers to send to the MCP server. Use for authentication or other
   * purposes.
   */
  headers: z.record(z.string(), z.string()).nullable().optional(),

  /**
   * Specify which of the MCP server's tools require approval.
   */
  require_approval: z
    .union([
      McpToolApprovalFilter,
      z.literal('always'),
      z.literal('never'),
      z.null(),
    ])
    .optional(),

  /**
   * Optional description of the MCP server, used to provide more context.
   */
  server_description: z.string().optional(),

  /**
   * The URL for the MCP server. One of `server_url` or `connector_id` must be
   * provided.
   */
  server_url: z.string().optional(),
});

export type Mcp = z.infer<typeof Mcp>;

/**
 * A tool that runs Python code to help generate a response to a prompt.
 */
export const CodeInterpreter = z.object({
  /**
   * The code interpreter container. Can be a container ID or an object that
   * specifies uploaded file IDs to make available to your code.
   */
  container: z.union([
    z.string(),
    z.object({
      type: z.literal('auto'),
      file_ids: z.array(z.string()).optional(),
    }),
  ]),

  /**
   * The type of the code interpreter tool. Always `code_interpreter`.
   */
  type: z.literal('code_interpreter'),
});

export type CodeInterpreter = z.infer<typeof CodeInterpreter>;

/**
 * A tool that generates images using a model like `gpt-image-1`.
 */
export const ImageGeneration = z.object({
  /**
   * The type of the image generation tool. Always `image_generation`.
   */
  type: z.literal('image_generation'),

  /**
   * Background type for the generated image. One of `transparent`, `opaque`, or
   * `auto`. Default: `auto`.
   */
  background: z
    .union([z.literal('transparent'), z.literal('opaque'), z.literal('auto')])
    .optional(),

  /**
   * Control how much effort the model will exert to match the style and features,
   * especially facial features, of input images. This parameter is only supported
   * for `gpt-image-1`. Supports `high` and `low`. Defaults to `low`.
   */
  input_fidelity: z
    .union([z.literal('high'), z.literal('low'), z.null()])
    .optional(),

  /**
   * Optional mask for inpainting. Contains `image_url` (string, optional) and
   * `file_id` (string, optional).
   */
  input_image_mask: z
    .object({
      image_url: z.string().optional(),
      file_id: z.string().optional(),
    })
    .optional(),

  /**
   * The image generation model to use. Default: `gpt-image-1`.
   */
  model: z.literal('gpt-image-1').optional(),

  /**
   * Moderation level for the generated image. Default: `auto`.
   */
  moderation: z.union([z.literal('auto'), z.literal('low')]).optional(),

  /**
   * Compression level for the output image. Default: 100.
   */
  output_compression: z.number().optional(),

  /**
   * The output format of the generated image. One of `png`, `webp`, or `jpeg`.
   * Default: `png`.
   */
  output_format: z
    .union([z.literal('png'), z.literal('webp'), z.literal('jpeg')])
    .optional(),

  /**
   * Number of partial images to generate in streaming mode, from 0 (default value)
   * to 3.
   */
  partial_images: z.number().optional(),

  /**
   * The quality of the generated image. One of `low`, `medium`, `high`, or `auto`.
   * Default: `auto`.
   */
  quality: z
    .union([
      z.literal('low'),
      z.literal('medium'),
      z.literal('high'),
      z.literal('auto'),
    ])
    .optional(),

  /**
   * The size of the generated image. One of `1024x1024`, `1024x1536`, `1536x1024`,
   * or `auto`. Default: `auto`.
   */
  size: z
    .union([
      z.literal('1024x1024'),
      z.literal('1024x1536'),
      z.literal('1536x1024'),
      z.literal('auto'),
    ])
    .optional(),
});

export type ImageGeneration = z.infer<typeof ImageGeneration>;
/**
 * Defines a function in your own code the model can choose to call. Learn more
 * about
 * [function calling](https://platform.openai.com/docs/guides/function-calling).
 */
export const FunctionTool = z.object({
  /**
   * The name of the function to call.
   */
  name: z.string(),

  /**
   * A JSON schema object describing the parameters of the function.
   */
  parameters: z.record(z.string(), z.unknown()).nullable(),

  /**
   * Whether to enforce strict parameter validation. Default `true`.
   */
  strict: z.boolean().nullable(),

  /**
   * The type of the function tool. Always `function`.
   */
  type: z.literal('function'),

  /**
   * A description of the function. Used by the model to determine whether or not to
   * call the function.
   */
  description: z.string().nullable().optional(),
});

export type FunctionTool = z.infer<typeof FunctionTool>;

/**
 * A response to an MCP approval request.
 */
export const McpApprovalResponse = z.object({
  /**
   * The ID of the approval request being answered.
   */
  approval_request_id: z.string(),

  /**
   * Whether the request was approved.
   */
  approve: z.boolean(),

  /**
   * The type of the item. Always `mcp_approval_response`.
   */
  type: z.literal('mcp_approval_response'),

  /**
   * The unique ID of the approval response
   */
  id: z.string().nullable().optional(),

  /**
   * Optional reason for the decision.
   */
  reason: z.string().nullable().optional(),
});

export type McpApprovalResponse = z.infer<typeof McpApprovalResponse>;

/**
 * A description of the chain of thought used by a reasoning model while generating
 * a response. Be sure to include these items in your `input` to the Responses API
 * for subsequent turns of a conversation if you are manually
 * [managing context](https://platform.openai.com/docs/guides/conversation-state).
 */
export const ResponseReasoningItem = z.object({
  /**
   * The unique identifier of the reasoning content.
   */
  id: z.string(),

  /**
   * Reasoning summary content.
   */
  summary: z.array(z.unknown()),

  /**
   * The type of the object. Always `reasoning`.
   */
  type: z.literal('reasoning'),

  /**
   * Reasoning text content.
   */
  content: z.array(z.unknown()).optional(),

  /**
   * The encrypted content of the reasoning item - populated when a response is
   * generated with `reasoning.encrypted_content` in the `include` parameter.
   */
  encrypted_content: z.string().nullable().optional(),

  /**
   * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
   * Populated when items are returned via API.
   */
  status: z
    .union([
      z.literal('in_progress'),
      z.literal('completed'),
      z.literal('incomplete'),
    ])
    .optional(),
});

/**
 * The output of a function tool call.
 */
export const ResponsesAPIFunctionCallOutput = z.object({
  /**
   * The unique ID of the function tool call generated by the model.
   */
  call_id: z.string(),

  /**
   * A JSON string of the output of the function tool call.
   */
  output: z.string(),

  /**
   * The type of the function tool call output.
   */
  type: z.string(),

  /**
   * The unique ID of the function tool call output. Populated when this item is
   * returned via API.
   */
  id: z.string().optional(),

  /**
   * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
   * Populated when items are returned via API.
   */
  status: z
    .union([
      z.literal('in_progress'),
      z.literal('completed'),
      z.literal('incomplete'),
    ])
    .optional(),
});

export type ResponsesAPIFunctionCallOutput = z.infer<
  typeof ResponsesAPIFunctionCallOutput
>;

export const ResponsesAPITool = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  input: z.string(),
  output: z.string(),
});

export const ResponsesRequestBody = z.object({
  input: z.union([
    z.string(),
    z.array(
      z.union([
        ChatCompletionMessage,
        ResponsesAPIReasoningOutput,
        ResponsesAPIFunctionCall,
        ResponsesAPIFunctionCallOutput,
        ResponsesAPIOutputWithRefusal,
        McpListTools,
        McpApprovalRequest,
        McpApprovalResponse,
        McpCall,
      ]),
    ),
  ]),
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
  tools: z
    .array(
      z.union([
        FunctionTool,
        FileSearchTool,
        WebSearchTool,
        ComputerTool,
        Mcp,
        CodeInterpreter,
        ImageGeneration,
        LocalShell,
        CustomTool,
      ]),
    )
    .optional(),
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
