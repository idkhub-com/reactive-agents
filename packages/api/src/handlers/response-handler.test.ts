import { responseHandler } from '@api/handlers/response-handler';
import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api/response';
import { AIProvider } from '@shared/types/constants';
import { CacheStatus } from '@shared/types/middleware/cache';
import { describe, expect, it } from 'vitest';

/**
 * A provider that *fails* a streaming request answers with one plain JSON
 * error, not a stream. The transform registered under the `stream_`-prefixed
 * function name is a chunk transform that takes strings; feeding it the
 * parsed error body used to crash with `responseChunk.trim is not a function`
 * and bury the provider's actual message. What reaches the caller has to be
 * the provider's error, on the provider's status code.
 */

const saRequestDataOf = (
  functionName: FunctionName,
  stream: boolean,
): SuperAgentsRequestData =>
  ({
    functionName,
    requestBody: {
      model: 'qwen3.8-27b',
      messages: [{ role: 'user', content: 'hello' }],
      stream,
    },
    responseSchema: ChatCompletionResponseBody,
  }) as unknown as SuperAgentsRequestData;

/** The error Ollama really answers with for an unknown model. */
const ollamaNotFound = () =>
  new Response(
    JSON.stringify({
      error: {
        message: "model 'qwen3.8-27b' not found",
        type: 'not_found_error',
        param: null,
        code: null,
      },
    }),
    {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    },
  );

const handle = (streamingMode: boolean, functionName: FunctionName) =>
  responseHandler(
    ollamaNotFound(),
    streamingMode,
    AIProvider.OLLAMA,
    functionName,
    'http://localhost:11434/v1/chat/completions',
    CacheStatus.MISS,
    saRequestDataOf(functionName, streamingMode),
    false,
    false,
  );

describe('responseHandler with a provider error', () => {
  it('passes a failed streaming request through the non-stream transform', async () => {
    const { response } = await handle(true, FunctionName.STREAM_CHAT_COMPLETE);

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("model 'qwen3.8-27b' not found");
  });

  it('treats a failed plain request the same way', async () => {
    const { response } = await handle(false, FunctionName.CHAT_COMPLETE);

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("model 'qwen3.8-27b' not found");
  });
});
