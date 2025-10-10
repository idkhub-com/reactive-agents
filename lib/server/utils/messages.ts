import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';

export function applyMessageWindow(
  messages: ChatCompletionMessage[],
  windowSize: number,
): ChatCompletionMessage[] {
  if (windowSize <= 0) {
    return messages;
  }

  // Filter to user/assistant messages only (exclude system/developer)
  const conversationMessages = messages.filter(
    (msg) =>
      msg.role !== ChatCompletionMessageRole.SYSTEM &&
      msg.role !== ChatCompletionMessageRole.DEVELOPER,
  );

  // Count turns (user+assistant pairs)
  const turns: ChatCompletionMessage[][] = [];
  let currentTurn: ChatCompletionMessage[] = [];

  for (const message of conversationMessages) {
    if (message.role === ChatCompletionMessageRole.USER) {
      // Start a new turn
      if (currentTurn.length > 0) {
        turns.push([...currentTurn]);
      }
      currentTurn = [message];
    } else if (message.role === ChatCompletionMessageRole.ASSISTANT) {
      // Add to current turn
      currentTurn.push(message);
    }
  }

  // Add the last turn if it exists
  if (currentTurn.length > 0) {
    turns.push(currentTurn);
  }

  // If we have fewer turns than window size, return all
  if (turns.length <= windowSize) {
    return messages;
  }

  // Take last N turns
  const windowedTurns = turns.slice(-windowSize);
  const windowedMessages = windowedTurns.flat();

  // Preserve system messages at the beginning
  const systemMessages = messages.filter(
    (msg) =>
      msg.role === ChatCompletionMessageRole.SYSTEM ||
      msg.role === ChatCompletionMessageRole.DEVELOPER,
  );

  return [...systemMessages, ...windowedMessages];
}

export function formatMessagesForExtraction(
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
