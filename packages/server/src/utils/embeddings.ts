import { API_URL, BEARER_TOKEN } from '@server/constants';
import type { UserDataStorageConnector } from '@server/types/connector';
import { resolveEmbeddingModelConfig } from '@server/utils/evaluation-model-resolver';
import { warn } from '@shared/console-logging';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { nanoid } from 'nanoid';

export class RequestEmbeddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestEmbeddingError';
  }
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
  raRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
  connector: UserDataStorageConnector,
): Promise<number[]> {
  // Resolve embedding model from system settings (includes dimensions)
  const embeddingConfig = await resolveEmbeddingModelConfig(connector);

  if (!embeddingConfig) {
    warn('[EMBEDDING] No embedding model configured in system settings');
    throw new RequestEmbeddingError(
      'No embedding model configured in system settings',
    );
  }

  // Look up the provider to get the API key
  const providers = await connector.getAIProviderAPIKeys({
    id: embeddingConfig.model.ai_provider_id,
  });
  if (providers.length === 0) {
    warn(
      `[EMBEDDING] Provider not found for model: ${embeddingConfig.model.ai_provider_id}`,
    );
    throw new RequestEmbeddingError('Embedding model provider not found');
  }
  const providerConfig = providers[0];

  if (!providerConfig.api_key) {
    warn(
      `[EMBEDDING] No API key configured for provider: ${embeddingConfig.model.ai_provider_id}`,
    );
    throw new RequestEmbeddingError(
      'No API key configured for embedding provider',
    );
  }

  try {
    const messages = extractMessagesFromRequestData(raRequestData);
    const inputText = formatMessagesForEmbedding(messages);

    if (!inputText.trim()) {
      throw new RequestEmbeddingError(
        'No valid text content found in messages',
      );
    }

    const raConfig = {
      targets: [
        {
          provider: providerConfig.ai_provider,
          model: embeddingConfig.model.model_name,
          api_key: providerConfig.api_key,
        },
      ],
      agent_name: 'reactive-agents',
      skill_name: 'embedding',
    };

    // We use the fetch instead of the openai library because the openai
    // library attempts to automatically truncate the embeddings to fit their models'
    // dimensions.
    const response = await fetch(`${API_URL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'ra-config': JSON.stringify(raConfig),
      },
      body: JSON.stringify({
        model: embeddingConfig.model.model_name,
        input: inputText,
        dimensions: embeddingConfig.dimensions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new RequestEmbeddingError(
        `Embedding API returned ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      data?: { embedding: number[] }[];
    };

    if (!data.data || data.data.length === 0) {
      throw new RequestEmbeddingError(
        'No embedding data returned from AI Provider',
      );
    }

    const embeddingData = data.data[0];

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
