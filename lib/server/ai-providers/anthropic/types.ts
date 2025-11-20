import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';

export interface AnthropicTool {
  cache_control?: { type: 'ephemeral' };
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties?: Record<
      string,
      {
        type: string;
        description: string;
      }
    >;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface AnthropicToolResultContentItem {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
}

export interface AnthropicBase64ImageContentItem {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface AnthropicUrlImageContentItem {
  type: 'image';
  source: {
    type: 'url';
    url: string;
  };
}

export interface AnthropicTextContentItem {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface AnthropicUrlPdfContentItem {
  type: string;
  source: {
    type: string;
    url: string;
  };
}

export interface AnthropicBase64PdfContentItem {
  type: string;
  source: {
    type: string;
    data: string;
    media_type: string;
  };
}

export interface AnthropicPlainTextContentItem {
  type: string;
  source: {
    type: string;
    data: string;
    media_type: string;
  };
}

export type AnthropicMessageContentItem =
  | AnthropicToolResultContentItem
  | AnthropicBase64ImageContentItem
  | AnthropicUrlImageContentItem
  | AnthropicTextContentItem
  | AnthropicUrlPdfContentItem
  | AnthropicBase64PdfContentItem
  | AnthropicPlainTextContentItem;

export interface AnthropicMessage extends ChatCompletionMessage {
  cache_control?: { type: 'ephemeral' };
  content: AnthropicMessageContentItem[];
}

export interface AnthropicErrorObject {
  type: string;
  message: string;
}

export interface AnthropicErrorResponse {
  type: string;
  error: AnthropicErrorObject;
}

export interface AnthropicToolContentItem {
  type: 'tool_use';
  name: string;
  id: string;
  input: Record<string, unknown>;
}
export type AnthropicContentItem =
  | AnthropicTextContentItem
  | AnthropicToolContentItem;

export interface AnthropicCompleteResponse {
  completion: string;
  stop_reason: string;
  model: string;
  truncated: boolean;
  stop: null | string;
  log_id: string;
  exception: null | string;
}

export type AnthropicStreamState = {
  toolIndex?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  model?: string;
  jsonOutputToolId?: string;
  jsonOutputToolIndex?: number;
};
