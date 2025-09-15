import { createLineSplitter } from '@server/handlers/stream-handler-utils';
import { transformUsingProviderConfig } from '@server/services/transform-to-provider-request';
import type {
  RequestHandlerFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { FileUploadResponseBody } from '@shared/types/api/routes/files-api';
import { chatCompleteParams } from '../open-ai-base';
import { vertexAPIConfig } from './api';
import {
  vertexAnthropicChatCompleteConfig,
  vertexGoogleChatCompleteConfig,
  vertexLlamaChatCompleteConfig,
} from './chat-complete';
import { GoogleResponseHandler, getModelAndProvider } from './utils';

const PROVIDER_CONFIG = {
  google: vertexGoogleChatCompleteConfig,
  anthropic: vertexAnthropicChatCompleteConfig,
  meta: vertexLlamaChatCompleteConfig,
  endpoints: chatCompleteParams(['model']),
};

const encoder = new TextEncoder();

export const googleFileUploadRequestHandler: RequestHandlerFunction = async ({
  c,
  idkTarget,
  idkRequestData,
}) => {
  if (!(idkRequestData.requestBody instanceof ReadableStream)) {
    return GoogleResponseHandler(
      'Invalid request, please provide a readable stream',
      400,
    );
  }

  const { vertex_storage_bucket_name, filename, vertex_model_name } = idkTarget;

  if (!vertex_model_name || !vertex_storage_bucket_name) {
    return GoogleResponseHandler(
      'Invalid request, please provide `x-portkey-provider-model` and `x-portkey-vertex-storage-bucket-name` in the request headers',
      400,
    );
  }

  const objectKey = filename ?? `${crypto.randomUUID()}.jsonl`;
  const bytes = idkRequestData.requestHeaders['content-length'];
  const { provider } = getModelAndProvider(vertex_model_name ?? '');
  let providerConfig =
    PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];

  if (!providerConfig) {
    providerConfig = PROVIDER_CONFIG.endpoints;
  }

  let isPurposeHeader = false;
  let purpose = '';
  // Create a reusable line splitter stream
  const lineSplitter = createLineSplitter();

  // Transform stream to process each complete line.
  const transformStream = new TransformStream({
    transform: (chunk, controller): void => {
      let buffer: string | null = null;
      try {
        const _chunk = chunk.toString();

        const match = _chunk.match(/name="([^"]+)"/);
        const headerKey = match ? match[1] : null;

        if (headerKey && headerKey === 'purpose') {
          isPurposeHeader = true;
          return;
        }

        if (isPurposeHeader && _chunk?.length > 0 && !purpose) {
          isPurposeHeader = false;
          purpose = _chunk.trim();
          return;
        }

        if (!_chunk) {
          return;
        }

        const json = JSON.parse(chunk.toString());

        if (json && !purpose) {
          // Close the stream.
          controller.terminate();
        }

        const toTranspose = purpose === 'batch' ? json.body : json;
        const transformedBody = transformUsingProviderConfig(
          providerConfig,
          toTranspose,
          idkTarget,
        );

        delete transformedBody.model;

        let bufferTransposed: Record<string, unknown>;
        if (purpose === 'fine-tune') {
          bufferTransposed = transformedBody;
        } else {
          bufferTransposed = {
            request: transformedBody,
          };
        }
        buffer = JSON.stringify(bufferTransposed);
      } catch {
        buffer = null;
      } finally {
        if (buffer) {
          controller.enqueue(encoder.encode(`${buffer}\n`));
        }
      }
    },
    flush(controller): void {
      controller.terminate();
    },
  });

  // Pipe the node stream through our line splitter and into the transform stream.
  idkRequestData.requestBody
    .pipeThrough(lineSplitter)
    .pipeTo(transformStream.writable);

  const providerHeaders = await vertexAPIConfig.headers({
    c,
    idkTarget: idkTarget,
    idkRequestData,
  });

  const encodedFile = encodeURIComponent(objectKey ?? '');
  const url = `https://storage.googleapis.com/${vertex_storage_bucket_name}/${encodedFile}`;

  const options = {
    body: transformStream.readable,
    headers: {
      Authorization: providerHeaders.Authorization,
      'Content-Type': 'application/octet-stream',
    },
    method: 'PUT',
    duplex: 'half',
  };

  try {
    const request = await fetch(url, { ...options });
    if (!request.ok) {
      const error = await request.text();
      return GoogleResponseHandler(error, request.status);
    }

    const response = {
      filename: filename,
      id: encodeURIComponent(`gs://${vertex_storage_bucket_name}/${objectKey}`),
      object: 'file',
      create_at: Date.now(),
      purpose: purpose,
      bytes: Number.parseInt(bytes ?? '0', 10),
      status: 'processed',
    };

    return GoogleResponseHandler(response, 200);
  } catch {
    if (!purpose) {
      return new Response(
        JSON.stringify({ message: 'Purpose is not set', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({ message: 'Something went wrong', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const googleFileUploadResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
) => {
  return aiProviderResponseBody as unknown as FileUploadResponseBody;
};
