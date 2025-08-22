import type { GoogleBatchRecord } from '@server/ai-providers/google/types';
import { createLineSplitter } from '@server/handlers/stream-handler-utils';
import type {
  RequestHandlerFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { RetrieveBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { responseTransformers } from '../open-ai-base';
import { vertexAPIConfig } from './api';
import {
  vertexAnthropicChatCompleteResponseTransform,
  vertexGoogleChatCompleteResponseTransform,
  vertexLlamaChatCompleteResponseTransform,
} from './chat-complete';
import { getModelAndProvider } from './utils';

const responseTransforms = {
  google: vertexGoogleChatCompleteResponseTransform,
  anthropic: vertexAnthropicChatCompleteResponseTransform,
  meta: vertexLlamaChatCompleteResponseTransform,
  endpoints: responseTransformers(AIProvider.GOOGLE_VERTEX_AI, {
    chatComplete: true,
  })[FunctionName.CHAT_COMPLETE],
};

type TransformFunction = (response: unknown) => Record<string, unknown>;

const getOpenAIBatchRow = ({
  row,
  batchId,
  transform,
}: {
  row: Record<string, unknown>;
  transform: TransformFunction;
  batchId: string;
}): Record<string, unknown> => {
  const response = (row.response ?? {}) as Record<string, unknown>;
  const id = `batch-${batchId}-${response.responseId}`;
  return {
    id,
    custom_id: response.responseId,
    response: {
      status_code: 200,
      request_id: id,
      body: transform(response),
    },
    error: null,
  };
};

export const googleBatchOutputRequestHandler: RequestHandlerFunction = async ({
  c,
  idkTarget,
  idkRequestData,
}) => {
  const headers = await vertexAPIConfig.headers({
    c,
    idkTarget,
    idkRequestData,
  });

  const options = {
    method: 'GET',
    headers,
  };

  // URL: <gateway>/v1/batches/<batchId>/output
  const batchId = idkRequestData.url.split('/').at(-2);

  // const batchDetailsURL = idkRequestData.url.replace(/\/output$/, '');  // TODO: Fix this

  const baseURL = await vertexAPIConfig.getBaseURL({
    c,
    idkTarget,
    idkRequestData,
  });

  const endpoint = vertexAPIConfig.getEndpoint({
    c,
    idkTarget,
    idkRequestData,
  });

  const batchesURL = `${baseURL}${endpoint}`;
  let modelName = '';
  let outputURL = '';
  try {
    const response = await fetch(batchesURL, options);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    const data = (await response.json()) as GoogleBatchRecord;
    outputURL = data.outputInfo?.gcsOutputDirectory ?? '';
    modelName = data.model;
  } catch (error) {
    const errorMessage =
      (error as Error).message || 'Failed to retrieve batch output';
    throw new Error(errorMessage);
  }

  if (!outputURL) {
    throw new Error('Failed to retrieve batch details');
  }

  const { provider } = getModelAndProvider(modelName ?? '');
  const responseTransform =
    responseTransforms[provider as keyof typeof responseTransforms] ||
    responseTransforms.endpoints;

  outputURL = outputURL.replace('gs://', 'https://storage.googleapis.com/');
  const outputResponse = await fetch(`${outputURL}/predictions.jsonl`, options);

  const reader = outputResponse.body;
  if (!reader) {
    throw new Error('Failed to retrieve batch output');
  }

  const encoder = new TextEncoder();

  // Prepare a transform stream to process complete lines.
  const responseStream = new TransformStream({
    transform(
      chunk: Uint8Array,
      controller: TransformStreamDefaultController,
    ): void {
      let buffer = '';
      try {
        const json = JSON.parse(chunk.toString());
        const row = getOpenAIBatchRow({
          row: json,
          batchId: batchId ?? '',
          transform: responseTransform as unknown as TransformFunction,
        });
        buffer = JSON.stringify(row);
      } catch {
        return;
      }
      controller.enqueue(encoder.encode(`${buffer}\n`));
    },
    flush(controller: TransformStreamDefaultController): void {
      controller.terminate();
    },
  });

  const [safeStream] = responseStream.readable.tee();

  // Pipe the node stream through the line splitter and then to the response stream.
  const lineSplitter = createLineSplitter();
  reader.pipeThrough(lineSplitter).pipeTo(responseStream.writable);

  return new Response(safeStream, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
};

export const BatchOutputResponseTransform: ResponseTransformFunction = (
  response,
) => {
  return response as unknown as RetrieveBatchResponseBody;
};
