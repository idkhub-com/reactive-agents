import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import z from 'zod';

/**
 * Ollama chat completion response interface
 */
export interface OllamaChatCompleteResponse extends ChatCompletionResponseBody {
  system_fingerprint?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama error response interface
 */
export interface OllamaErrorResponse extends ErrorResponseBody {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * Ollama stream chunk interface for streaming responses
 */
export interface OllamaStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint?: string;
  choices: {
    delta: {
      role?: string;
      content?: string;
      tool_calls?: object[];
    };
    index: number;
    finish_reason: string | null;
  }[];
}

/**
 * Ollama embedding response interface
 */
export interface OllamaEmbedResponse {
  embedding: number[];
  model?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Custom fields schema for Ollama AI provider configuration
 * These fields are stored in the ai_providers.custom_fields JSONB column
 */
export const OllamaCustomFieldsSchema = z.object({
  custom_host: z
    .string()
    .url('Please enter a valid URL')
    .max(2048, 'URL is too long (maximum 2048 characters)')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'Custom host must use HTTP or HTTPS protocol',
    )
    .optional()
    .describe('Custom Ollama server URL (e.g., http://localhost:11434)'),
});

export type OllamaCustomFields = z.infer<typeof OllamaCustomFieldsSchema>;
