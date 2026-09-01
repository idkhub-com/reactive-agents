import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';

/**
 * The judges read conversations through `formatMessagesForExtraction`, which
 * drops system messages -- right for embeddings, blinding for judgment: a
 * title generator's output looks like an ignored code-review request unless
 * the judge knows what the assistant was told to do. This renders the system
 * (and developer) messages so a judge can be shown the assistant's role.
 */
export function extractSystemPromptFromMessages(
  messages: ChatCompletionMessage[],
): string {
  const MAX_ROLE_LENGTH = 4000;
  return messages
    .filter(
      (message) =>
        message.role === ChatCompletionMessageRole.SYSTEM ||
        message.role === ChatCompletionMessageRole.DEVELOPER,
    )
    .map((message) => {
      if (typeof message.content === 'string') {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        return message.content
          .map((item) =>
            typeof item === 'object' && item.text ? item.text : '',
          )
          .filter(Boolean)
          .join(' ');
      }
      return message.content ? String(message.content) : '';
    })
    .filter((content) => content.trim())
    .join('\n\n')
    .slice(0, MAX_ROLE_LENGTH);
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

      // The tool's output is the message's content. This used to render
      // before content was computed, so every tool output read as empty --
      // and the judges scored conversations as if the agent got nothing back.
      if (
        role === ChatCompletionMessageRole.TOOL ||
        role === ChatCompletionMessageRole.FUNCTION
      ) {
        return `Tool Call ${message.tool_call_id} Output: ${content}`;
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
