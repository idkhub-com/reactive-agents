import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';

export class RequestEmbeddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestEmbeddingError';
  }
}

function extractMessagesFromResponsesRequest(
  idkRequestData: ResponsesRequestData,
): ChatCompletionMessage[] {
  const input = idkRequestData.requestBody.input;
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
  idkRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
): ChatCompletionMessage[] {
  switch (idkRequestData.functionName) {
    case FunctionName.CHAT_COMPLETE:
      return idkRequestData.requestBody.messages;
    case FunctionName.STREAM_CHAT_COMPLETE:
      return idkRequestData.requestBody.messages;
    case FunctionName.CREATE_MODEL_RESPONSE:
      return extractMessagesFromResponsesRequest(idkRequestData);
  }
}

export function formatMessagesForEmbedding(
  messages: ChatCompletionMessage[],
): string {
  return messages
    .filter((message) => {
      // Exclude system and developer messages from embeddings
      return (
        message.role !== ChatCompletionMessageRole.SYSTEM &&
        message.role !== ChatCompletionMessageRole.DEVELOPER
      );
    })
    .map((message) => {
      const role = message.role;
      let content = '';

      if (
        role === ChatCompletionMessageRole.TOOL ||
        role === ChatCompletionMessageRole.FUNCTION
      ) {
        return `Tool Call ${message.tool_call_id} Output: ${content}`;
      }

      if (typeof message.content === 'string') {
        content += message.content;
      } else if (Array.isArray(message.content)) {
        content += message.content
          .map((item) => {
            if (typeof item === 'object' && item.text) {
              return item.text;
            }
            return '';
          })
          .filter(Boolean)
          .join(' ');
      } else if (message.content) {
        content += String(message.content);
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        const tools = message.tool_calls
          .map((tool) => {
            const parsedTool = tool as {
              id: string;
              type: 'mcp_call';
              function: {
                name: string;
                arguments: string;
              };
            };
            return `Tool Call ID: ${parsedTool.id}\nTool Call Name: ${parsedTool.function.name}\nTool Call Arguments: ${parsedTool.function.arguments}`;
          })
          .join(', ');
        return `Assistant Tool Calls:\n${tools}`;
      }

      // Only include messages with non-empty content after trimming
      if (!content.trim()) {
        return '';
      }

      if (role === ChatCompletionMessageRole.USER) {
        return `User: ${content}`.trim();
      }
      if (role === ChatCompletionMessageRole.ASSISTANT) {
        return `Assistant: ${content}`.trim();
      }

      return `${role}: ${content}`.trim();
    })
    .filter(Boolean)
    .join('\n\n\n');
}

export async function generateEmbeddingForRequest(
  idkRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
): Promise<number[]> {
  // Check if OpenAI API key is available
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[EMBEDDING] can't generate embedding - No OPENAI_API_KEY found`,
    );
  }

  try {
    const messages = extractMessagesFromRequestData(idkRequestData);
    const inputText = formatMessagesForEmbedding(messages);

    if (!inputText.trim()) {
      throw new RequestEmbeddingError(
        'No valid text content found in messages',
      );
    }

    const client = new OpenAI({
      apiKey: BEARER_TOKEN,
      baseURL: `${API_URL}/v1`,
    });

    const idkhubConfig = {
      targets: [
        {
          provider: 'openai',
          model: 'text-embedding-3-small',
          api_key: apiKey,
        },
      ],
      agent_name: 'idkhub',
      skill_name: 'embeddings',
    };

    const response = await client
      .withOptions({
        defaultHeaders: {
          'x-idk-config': JSON.stringify(idkhubConfig),
        },
      })
      .embeddings.create({
        model: 'text-embedding-3-small',
        input: inputText,
      });

    if (!response.data || response.data.length === 0) {
      throw new RequestEmbeddingError(
        'No embedding data returned from AI Provider',
      );
    }

    const embeddingData = response.data[0];

    return embeddingData.embedding;
  } catch (error) {
    if (error instanceof RequestEmbeddingError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new RequestEmbeddingError(
        `Failed to generate embedding: ${error.message}`,
      );
    }
    throw new RequestEmbeddingError(`Unknown error generating embedding`);
  }
}
