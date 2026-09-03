import {
  ChatCompletionFinishReason,
  type ChatCompletionRequestBody,
  type ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { render, screen } from '@testing-library/react';
import { ChatCompletionsAPIViewer } from '@web/components/agents/skills/logs/components/completion-viewer/chat-completions-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js theme
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: 'light' })),
}));

interface GenericViewerProps {
  children: React.ReactNode;
  defaultValue: string;
  variant?: string;
}

// Mock GenericViewer component. `variant` is surfaced because it is what
// gives the agent's own answer its background.
vi.mock('@web/components/agents/skills/logs/components/generic-viewer', () => ({
  GenericViewer: ({ children, defaultValue, variant }: GenericViewerProps) => (
    <div data-testid="generic-viewer" data-variant={variant}>
      {children}
      <div data-testid="viewer-content">{defaultValue}</div>
    </div>
  ),
}));

describe('ChatCompletionsAPIViewer - Tool Calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tool calls from response', () => {
    const requestBody: ChatCompletionRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.SYSTEM,
          content: 'You are a helpful assistant',
        },
        {
          role: ChatCompletionMessageRole.USER,
          content: 'What is 15 multiplied by 8?',
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'calculate',
            description: 'Perform basic arithmetic operations',
            parameters: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['add', 'subtract', 'multiply', 'divide'],
                },
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['operation', 'a', 'b'],
            },
          },
        },
      ],
    };

    const responseBody: ChatCompletionResponseBody = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: null,
            tool_calls: [
              {
                id: 'call_abc123',
                type: 'function',
                function: {
                  name: 'calculate',
                  arguments: '{"operation":"multiply","a":15,"b":8}',
                },
              },
            ],
          },
          finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
        },
      ],
    };

    render(
      <ChatCompletionsAPIViewer
        logId="test-log"
        saRequestBody={requestBody}
        saResponseBody={responseBody}
      />,
    );

    // Check that tool call is rendered
    expect(screen.getByText('Function Call')).toBeInTheDocument();
    expect(screen.getByText('calculate')).toBeInTheDocument();
    expect(screen.getByText('call_abc123')).toBeInTheDocument();
    expect(screen.getByText('Arguments:')).toBeInTheDocument();

    // Check that arguments are displayed
    expect(
      screen.getByText((content) => content.includes('operation')),
    ).toBeInTheDocument();
  });

  it('should render multiple tool calls', () => {
    const requestBody: ChatCompletionRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Do some calculations',
        },
      ],
    };

    const responseBody: ChatCompletionResponseBody = {
      id: 'chatcmpl-456',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'add',
                  arguments: '{"a":5,"b":3}',
                },
              },
              {
                id: 'call_2',
                type: 'function',
                function: {
                  name: 'multiply',
                  arguments: '{"a":10,"b":2}',
                },
              },
            ],
          },
          finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
        },
      ],
    };

    render(
      <ChatCompletionsAPIViewer
        logId="test-log"
        saRequestBody={requestBody}
        saResponseBody={responseBody}
      />,
    );

    expect(screen.getByText('add')).toBeInTheDocument();
    expect(screen.getByText('call_1')).toBeInTheDocument();
    expect(screen.getByText('multiply')).toBeInTheDocument();
    expect(screen.getByText('call_2')).toBeInTheDocument();
  });

  it('should render message content when no tool calls', () => {
    const requestBody: ChatCompletionRequestBody = {
      model: 'gpt-4',
      messages: [{ role: ChatCompletionMessageRole.USER, content: 'Hello' }],
    };

    const responseBody: ChatCompletionResponseBody = {
      id: 'chatcmpl-789',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: 'Hello! How can I help you today?',
          },
          finish_reason: ChatCompletionFinishReason.STOP,
        },
      ],
    };

    render(
      <ChatCompletionsAPIViewer
        logId="test-log"
        saRequestBody={requestBody}
        saResponseBody={responseBody}
      />,
    );

    expect(screen.getByTestId('generic-viewer')).toBeInTheDocument();
    expect(
      screen.getByText('Hello! How can I help you today?'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Function Call')).not.toBeInTheDocument();
  });

  it('should render both message content and tool calls when present', () => {
    const requestBody: ChatCompletionRequestBody = {
      model: 'gpt-4',
      messages: [{ role: ChatCompletionMessageRole.USER, content: 'Help me' }],
    };

    const responseBody: ChatCompletionResponseBody = {
      id: 'chatcmpl-mixed',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: 'Let me help with that calculation.',
            tool_calls: [
              {
                id: 'call_help',
                type: 'function',
                function: {
                  name: 'calculate',
                  arguments: '{"operation":"add","a":1,"b":1}',
                },
              },
            ],
          },
          finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
        },
      ],
    };

    render(
      <ChatCompletionsAPIViewer
        logId="test-log"
        saRequestBody={requestBody}
        saResponseBody={responseBody}
      />,
    );

    // Both content and tool calls should be rendered
    expect(
      screen.getByText('Let me help with that calculation.'),
    ).toBeInTheDocument();
    expect(screen.getByText('calculate')).toBeInTheDocument();
    expect(screen.getByText('call_help')).toBeInTheDocument();
  });

  it("marks the answer and its tool calls as this turn's response", () => {
    const requestBody: ChatCompletionRequestBody = {
      model: 'gpt-4',
      messages: [
        { role: ChatCompletionMessageRole.USER, content: 'what is 1 + 1' },
      ],
    };
    const responseBody: ChatCompletionResponseBody = {
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 1,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: 'Two.',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'calculate', arguments: '{}' },
              },
            ],
          },
          finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
        },
      ],
    };

    const { container } = render(
      <ChatCompletionsAPIViewer
        logId="test-log"
        saRequestBody={requestBody}
        saResponseBody={responseBody}
      />,
    );

    // What the agent said in this turn, told apart from the conversation
    // that was sent to it by a background of its own.
    expect(screen.getByTestId('generic-viewer')).toHaveAttribute(
      'data-variant',
      'response',
    );
    expect(
      container.querySelector('[class*="bg-emerald"]'),
      'the tool call the agent just made is part of its answer',
    ).not.toBeNull();
  });
});
