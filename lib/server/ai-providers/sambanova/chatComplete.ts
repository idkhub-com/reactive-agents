import type { ResponseChunkStreamTransformFunction } from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';

export interface SambaNovaStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: {
    delta: {
      content?: string;
    };
    index: number;
    finish_reason: string | null;
    logprobs: object | null;
  }[];
  usage?: {
    is_last_response: boolean;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    time_to_first_token: number;
    end_time: number;
    start_time: number;
    total_latency: number;
    total_tokens_per_sec: number;
    completion_tokens_per_sec: number;
    completion_tokens_after_first_per_sec: number;
    completion_tokens_after_first_per_sec_first_ten: number;
  };
}

export const sambanovaChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk: SambaNovaStreamChunk = JSON.parse(chunk);
    if (parsedChunk.usage) {
      return `data: ${JSON.stringify({
        id: parsedChunk.id,
        object: parsedChunk.object,
        created: parsedChunk.created,
        model: parsedChunk.model,
        provider: AIProvider.SAMBANOVA,
        choices: [
          {
            index: 0,
            delta: {},
            logprobs: null,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: parsedChunk.usage.prompt_tokens || 0,
          completion_tokens: parsedChunk.usage.completion_tokens || 0,
          total_tokens: parsedChunk.usage.total_tokens || 0,
        },
      })}\n\n`;
    }

    // Validate that choices array exists and has at least one element
    const firstChoice = parsedChunk.choices?.[0];
    if (!firstChoice) {
      // Return a safe fallback response if no choices are available
      return `data: ${JSON.stringify({
        id: parsedChunk.id,
        object: parsedChunk.object,
        created: parsedChunk.created,
        model: parsedChunk.model,
        provider: AIProvider.SAMBANOVA,
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: '',
            },
            logprobs: null,
            finish_reason: null,
          },
        ],
      })}\n\n`;
    }

    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.SAMBANOVA,
      choices: [
        {
          index: firstChoice.index || 0,
          delta: {
            role: 'assistant',
            content: firstChoice.delta?.content || '',
          },
          logprobs: firstChoice.logprobs || null,
          finish_reason: firstChoice.finish_reason || null,
        },
      ],
    })}\n\n`;
  };
