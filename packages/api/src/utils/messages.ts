import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';

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
