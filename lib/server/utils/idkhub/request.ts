import { HttpMethod } from '@server/types/http';
import { FunctionName, type IdkRequestData } from '@shared/types/api/request';
import { ContentTypeName } from '@shared/types/constants';

/**
 * Constructs the request options for the API call.
 */
export function constructRequest(
  idkRequestData: IdkRequestData,
  providerConfigMappedHeaders: Record<string, string>,
  forwardedHeaders: Record<string, string>,
  proxyHeaders: Record<string, string>,
): RequestInit {
  // Store original content-type before header merging
  const originalContentType = idkRequestData.requestHeaders['content-type'];

  const baseHeaders = {
    'content-type': 'application/json',
  };

  const newHeaders: Record<string, string> = {};

  Object.keys(providerConfigMappedHeaders).forEach((h: string) => {
    newHeaders[h.toLowerCase()] = providerConfigMappedHeaders[h];
  });

  // Add any headers that the model might need
  const updatedHeaders: Record<string, string> = {
    ...newHeaders,
    ...baseHeaders,
    ...forwardedHeaders,
    ...(idkRequestData.functionName === 'proxy' && proxyHeaders),
  };

  delete updatedHeaders['content-length'];

  const fetchConfig: RequestInit = {
    method: idkRequestData.method,
    headers: updatedHeaders,
    ...(idkRequestData.functionName === FunctionName.UPLOAD_FILE && {
      duplex: 'half',
    }),
  };

  const contentType = originalContentType?.split(';')[0];

  const isGetMethod = idkRequestData.method === HttpMethod.GET;
  const isMultipartFormData =
    contentType === ContentTypeName.MULTIPART_FORM_DATA;
  const shouldDeleteContentTypeHeader =
    (isGetMethod || isMultipartFormData) && fetchConfig.headers;

  if (shouldDeleteContentTypeHeader) {
    const headers = fetchConfig.headers as Record<string, unknown>;
    delete headers['content-type'];
    if (idkRequestData.functionName === FunctionName.UPLOAD_FILE) {
      headers['Content-Type'] = originalContentType;
    }
  }

  return fetchConfig;
}
