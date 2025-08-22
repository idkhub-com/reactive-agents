import type {
  RequestHandlerFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { FileRetrieveResponseBody } from '@shared/types/api/routes/files-api';
import { vertexAPIConfig } from './api';
import { getBucketAndFile } from './utils';

export const googleRetrieveFileRequestHandler: RequestHandlerFunction = async ({
  c,
  idkTarget,
  idkRequestData,
}) => {
  const fileId = idkRequestData.url.split('/').pop();

  const { bucket, file } = getBucketAndFile(fileId ?? '');

  const googleHeaders = await vertexAPIConfig.headers({
    c,
    idkTarget,
    idkRequestData,
  });

  const url = `https://storage.googleapis.com/${bucket}/${file}`;

  const response = await fetch(url, {
    headers: googleHeaders as Record<string, string>,
    method: 'HEAD',
  });

  if (response.status !== 200) {
    throw new Error('File not found');
  }

  const responseHeaders = response.headers;

  const bytes = responseHeaders.get('Content-Length');
  const updatedAt = responseHeaders.get('Last-Modified');
  const createdAt = responseHeaders.get('Date');
  const id = fileId;
  const filename = file.split('/').pop();
  const purpose = null;
  const status = 'processed';

  const fileObject = {
    bytes: Number.parseInt(bytes ?? '0'),
    updatedAt: new Date(updatedAt ?? '').getTime(),
    createdAt: new Date(createdAt ?? '').getTime(),
    id,
    filename,
    purpose,
    status,
  };

  return new Response(JSON.stringify(fileObject), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const googleRetrieveFileResponseTransform: ResponseTransformFunction = (
  response,
) => {
  return response as unknown as FileRetrieveResponseBody;
};
