import { HttpMethod } from '@server/types/http';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ReactiveAgentsRequestData,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';

import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { ContentTypeName } from '@shared/types/constants';
import { nanoid } from 'nanoid';

/**
 * Constructs the request options for the API call.
 */
export function constructRequest(
  raRequestData: ReactiveAgentsRequestData,
  providerConfigMappedHeaders: Record<string, string>,
  forwardedHeaders: Record<string, string>,
  proxyHeaders: Record<string, string>,
): RequestInit {
  // Store original content-type before header merging
  const originalContentType = raRequestData.requestHeaders['content-type'];

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
    ...(raRequestData.functionName === 'proxy' && proxyHeaders),
  };

  delete updatedHeaders['content-length'];

  const fetchConfig: RequestInit = {
    method: raRequestData.method,
    headers: updatedHeaders,
    ...(raRequestData.functionName === FunctionName.UPLOAD_FILE && {
      duplex: 'half',
    }),
  };

  const contentType = originalContentType?.split(';')[0];

  const isGetMethod = raRequestData.method === HttpMethod.GET;
  const isMultipartFormData =
    contentType === ContentTypeName.MULTIPART_FORM_DATA;
  const shouldDeleteContentTypeHeader =
    (isGetMethod || isMultipartFormData) && fetchConfig.headers;

  if (shouldDeleteContentTypeHeader) {
    const headers = fetchConfig.headers as Record<string, unknown>;
    delete headers['content-type'];
    if (raRequestData.functionName === FunctionName.UPLOAD_FILE) {
      headers['Content-Type'] = originalContentType;
    }
  }

  return fetchConfig;
}

function extractMessagesFromResponsesRequest(
  raRequestData: ResponsesRequestData,
): ChatCompletionMessage[] {
  const input = raRequestData.requestBody.input;
  let messages: ChatCompletionMessage[] = [];

  if (typeof input === 'string') {
    messages = [
      {
        role: ChatCompletionMessageRole.USER,
        content: input,
      },
    ];
  } else {
    const idMap = new Map<string, string>();

    input.forEach((message) => {
      if (!('role' in message)) {
        if (
          'name' in message &&
          'call_id' in message &&
          message.type === 'function'
        ) {
          let id = idMap.get(message.call_id);
          if (!id) {
            id = nanoid(3);
            idMap.set(message.call_id, id);
          }
          messages.push({
            role: ChatCompletionMessageRole.ASSISTANT,
            tool_calls: [
              {
                id: id,
                type: 'function',
                function: {
                  name: message.name,
                  arguments: JSON.stringify(message.arguments),
                },
              },
            ],
          });
        } else if ('output' in message && 'call_id' in message) {
          let id = idMap.get(message.call_id);
          if (!id) {
            id = nanoid(3);
            idMap.set(message.call_id, id);
          }
          messages.push({
            role: ChatCompletionMessageRole.TOOL,
            tool_call_id: id,
            content: message.output,
          });
        } else if (message.type === 'mcp_call' && 'server_label' in message) {
          const id = nanoid(3);
          messages.push({
            role: ChatCompletionMessageRole.ASSISTANT,
            tool_calls: [
              {
                id: id,
                type: 'mcp_call',
                function: {
                  name: message.name,
                  arguments: JSON.stringify(message.arguments),
                },
              },
            ],
          });
          messages.push({
            role: ChatCompletionMessageRole.TOOL,
            tool_call_id: id,
            content: message.output ?? message.error ?? 'success',
          });
        }

        // If there is no role, we likely don't want to embed the message
        return;
      }
      messages.push(message);
    });
  }

  return messages;
}

export function extractMessagesFromRequestData(
  raRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
): ChatCompletionMessage[] {
  switch (raRequestData.functionName) {
    case FunctionName.CHAT_COMPLETE:
      return raRequestData.requestBody.messages;
    case FunctionName.STREAM_CHAT_COMPLETE:
      return raRequestData.requestBody.messages;
    case FunctionName.CREATE_MODEL_RESPONSE:
      return extractMessagesFromResponsesRequest(raRequestData);
  }
}
