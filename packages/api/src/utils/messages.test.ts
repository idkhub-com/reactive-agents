import { formatMessagesForExtraction } from '@api/utils/messages';
import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { describe, expect, it } from 'vitest';

/**
 * The conversation the evaluation judges read. The tool-output case is the
 * one that went wrong: the formatter rendered `Tool Call ... Output:` before
 * computing the content, so every tool result read as empty and the judges
 * scored agentic conversations as if the agent got nothing back.
 */
describe('formatMessagesForExtraction', () => {
  const messages: ChatCompletionMessage[] = [
    { role: ChatCompletionMessageRole.SYSTEM, content: 'You review code.' },
    { role: ChatCompletionMessageRole.USER, content: 'review the changes' },
    {
      role: ChatCompletionMessageRole.ASSISTANT,
      content: null,
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'bash', arguments: '{"command":"git status"}' },
        },
      ],
    },
    {
      role: ChatCompletionMessageRole.TOOL,
      tool_call_id: 'call_1',
      content: 'On branch main\nnothing to commit',
    },
  ] as ChatCompletionMessage[];

  it('carries the tool output, not just its id', () => {
    const formatted = formatMessagesForExtraction(messages);

    expect(formatted).toContain(
      'Tool Call call_1 Output: On branch main\nnothing to commit',
    );
  });

  it('renders the assistant tool calls and drops the system prompt', () => {
    const formatted = formatMessagesForExtraction(messages);

    expect(formatted).toContain('User: review the changes');
    expect(formatted).toContain('Tool Call Name: bash');
    expect(formatted).not.toContain('You review code.');
  });
});
