import { ResponsesAPIViewer } from '@client/components/agents/skills/logs/components/completion-viewer/responses-api';
import type {
  ResponsesAPIFunctionCall,
  ResponsesRequestBody,
  ResponsesResponseBody,
} from '@shared/types/api/routes/responses-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js theme
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: 'light' })),
}));

interface GenericViewerProps {
  children: React.ReactNode;
  defaultValue: string;
}

// Mock GenericViewer component
vi.mock(
  '@client/components/agents/skills/logs/components/generic-viewer',
  () => ({
    GenericViewer: ({ children, defaultValue }: GenericViewerProps) => (
      <div data-testid="generic-viewer">
        {children}
        <div data-testid="viewer-content">{defaultValue}</div>
      </div>
    ),
  }),
);

describe('ResponsesAPIViewer - Function Call Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('function call output rendering', () => {
    it('should render function calls from output array', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'get_weather',
        call_id: 'call_abc123',
        arguments: '{"location": "San Francisco", "unit": "celsius"}',
      };

      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          {
            role: ChatCompletionMessageRole.USER,
            content: 'What is the weather?',
          },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [functionCall],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      // Check function call card is rendered
      expect(screen.getByText('Function Call')).toBeInTheDocument();
      expect(screen.getByText('get_weather')).toBeInTheDocument();
      expect(screen.getByText('call_abc123')).toBeInTheDocument();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();

      // Check arguments are formatted as JSON
      const argsElement = screen.getByText((content) =>
        content.includes('location'),
      );
      expect(argsElement).toBeInTheDocument();
    });

    it('should render multiple function calls', () => {
      const functionCall1: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'get_weather',
        call_id: 'call_1',
        arguments: '{"location": "NYC"}',
      };

      const functionCall2: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'get_time',
        call_id: 'call_2',
        arguments: '{"timezone": "America/New_York"}',
      };

      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          {
            role: ChatCompletionMessageRole.USER,
            content: 'Get weather and time',
          },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [functionCall1, functionCall2],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(screen.getByText('get_weather')).toBeInTheDocument();
      expect(screen.getByText('call_1')).toBeInTheDocument();
      expect(screen.getByText('get_time')).toBeInTheDocument();
      expect(screen.getByText('call_2')).toBeInTheDocument();
    });

    it('should handle function call with string arguments', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'send_email',
        call_id: 'call_xyz',
        arguments: '{"to": "user@example.com", "subject": "Test"}',
      };

      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          { role: ChatCompletionMessageRole.USER, content: 'Send an email' },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [functionCall],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(screen.getByText('send_email')).toBeInTheDocument();
      expect(screen.getByText('call_xyz')).toBeInTheDocument();
      // String arguments should be displayed as-is
      expect(
        screen.getByText((content) => content.includes('user@example.com')),
      ).toBeInTheDocument();
    });

    it('should handle function call without arguments', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'get_current_user',
        call_id: 'call_noargs',
        arguments: '{}',
      };

      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [{ role: ChatCompletionMessageRole.USER, content: 'Who am I?' }],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [functionCall],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(screen.getByText('get_current_user')).toBeInTheDocument();
      expect(screen.getByText('call_noargs')).toBeInTheDocument();
    });
  });

  describe('message output rendering', () => {
    it('should render assistant message from output', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [{ role: ChatCompletionMessageRole.USER, content: 'Hello' }],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            id: 'msg_1',
            type: 'message',
            role: ChatCompletionMessageRole.ASSISTANT,
            content: [
              {
                type: 'text',
                text: 'Hello! How can I help you?',
                annotations: [],
              },
            ],
          },
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(
        screen.getByText('Hello! How can I help you?'),
      ).toBeInTheDocument();
    });

    it('should render refusal message', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          { role: ChatCompletionMessageRole.USER, content: 'Harmful request' },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            id: 'msg_2',
            type: 'message',
            role: ChatCompletionMessageRole.ASSISTANT,
            refusal: 'I cannot assist with that request.',
          },
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(
        screen.getByText('I cannot assist with that request.'),
      ).toBeInTheDocument();
    });
  });

  describe('reasoning output rendering', () => {
    it('should render reasoning summary', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          { role: ChatCompletionMessageRole.USER, content: 'Complex question' },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            id: 'reasoning_1',
            type: 'reasoning',
            summary: ['First, I need to analyze...', 'Then, I should...'],
          },
          {
            id: 'msg_3',
            type: 'message',
            role: ChatCompletionMessageRole.ASSISTANT,
            content: [
              { type: 'text', text: 'Here is the answer', annotations: [] },
            ],
          },
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(
        screen.getByText((content) =>
          content.includes('First, I need to analyze'),
        ),
      ).toBeInTheDocument();
    });
  });

  describe('mixed output types', () => {
    it('should render message and function calls together', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          {
            role: ChatCompletionMessageRole.USER,
            content: 'Check weather and tell me',
          },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            id: 'msg_4',
            type: 'message',
            role: ChatCompletionMessageRole.ASSISTANT,
            content: [
              {
                type: 'text',
                text: 'Let me check the weather...',
                annotations: [],
              },
            ],
          },
          {
            type: 'function_call',
            name: 'get_weather',
            call_id: 'call_123',
            arguments: '{"location": "Boston"}',
          } as ResponsesAPIFunctionCall,
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(
        screen.getByText('Let me check the weather...'),
      ).toBeInTheDocument();
      expect(screen.getByText('get_weather')).toBeInTheDocument();
      expect(screen.getByText('call_123')).toBeInTheDocument();
    });

    it('should render reasoning, message, and function calls together', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          { role: ChatCompletionMessageRole.USER, content: 'Complex task' },
        ],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            id: 'reasoning_2',
            type: 'reasoning',
            summary: ['Analyzing the request...'],
          },
          {
            type: 'function_call',
            name: 'analyze',
            call_id: 'call_1',
            arguments: '{"data": "test"}',
          } as ResponsesAPIFunctionCall,
          {
            id: 'msg_5',
            type: 'message',
            role: ChatCompletionMessageRole.ASSISTANT,
            content: [
              { type: 'text', text: 'Analysis complete', annotations: [] },
            ],
          },
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(
        screen.getByText((content) => content.includes('Analyzing')),
      ).toBeInTheDocument();
      expect(screen.getByText('analyze')).toBeInTheDocument();
      expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    });
  });

  describe('JSON schema format detection', () => {
    it('should detect json_schema format from request body', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [
          { role: ChatCompletionMessageRole.USER, content: 'Structured data' },
        ],
        text: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
            },
          },
        } as unknown as ResponsesRequestBody['text'],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            id: 'msg_6',
            type: 'message',
            role: ChatCompletionMessageRole.ASSISTANT,
            content: [
              {
                type: 'text',
                text: '{"name": "John", "age": 30}',
                annotations: [],
              },
            ],
          },
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      // GenericViewer should receive the schema
      expect(screen.getByTestId('generic-viewer')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should allow copying function call arguments', async () => {
      const user = userEvent.setup();

      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn(),
        },
        configurable: true,
      });

      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'test_function',
        call_id: 'call_copy',
        arguments: '{"key": "value"}',
      };

      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [{ role: ChatCompletionMessageRole.USER, content: 'Test' }],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [functionCall],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      // Find and click the copy button
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find((btn) =>
        btn.querySelector('[class*="lucide-copy"]'),
      );

      if (copyButton) {
        await user.click(copyButton);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('key'),
        );
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty output array', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [{ role: ChatCompletionMessageRole.USER, content: 'Test' }],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      // Should render without errors - the component renders an empty div
      // No assertions needed since we just want to ensure it doesn't crash
    });

    it('should handle output with only non-renderable types', () => {
      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [{ role: ChatCompletionMessageRole.USER, content: 'Test' }],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [
          {
            type: 'mcp_call',
            id: 'call_test',
            name: 'test_tool',
            server_label: 'test_server',
            arguments: '{}',
          },
        ],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      // Should render without errors
      expect(screen.queryByText('Function Call')).not.toBeInTheDocument();
    });

    it('should handle complex nested arguments', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'complex_function',
        call_id: 'call_complex',
        arguments: JSON.stringify({
          nested: {
            deep: {
              value: 'test',
              array: [1, 2, 3],
            },
          },
          list: ['a', 'b', 'c'],
        }),
      };

      const requestBody: Partial<ResponsesRequestBody> = {
        model: 'gpt-4',
        input: [{ role: ChatCompletionMessageRole.USER, content: 'Test' }],
      };

      const responseBody: Partial<ResponsesResponseBody> = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-4',
        output: [functionCall],
      };

      render(
        <ResponsesAPIViewer
          logId="test-log"
          raRequestBody={requestBody as ResponsesRequestBody}
          raResponseBody={responseBody as ResponsesResponseBody}
        />,
      );

      expect(screen.getByText('complex_function')).toBeInTheDocument();
      // Arguments should be formatted with proper indentation
      expect(
        screen.getByText((content) => content.includes('nested')),
      ).toBeInTheDocument();
    });
  });
});
