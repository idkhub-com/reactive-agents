import { MessagesView } from '@client/components/agents/skills/logs/components/messages-view';
import { FunctionName } from '@shared/types/api/request';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import type {
  ResponsesAPIFunctionCall,
  ResponsesAPIFunctionCallOutput,
} from '@shared/types/api/routes/responses-api';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

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

describe('MessagesView - Responses API Conversion', () => {
  const mockRequestData = {
    functionName: FunctionName.CREATE_MODEL_RESPONSE,
    requestBody: {
      model: 'gpt-4',
      input: [],
    },
    responseSchema: z.object({}),
    requestSchema: z.object({}),
    route_pattern: /\/v1\/responses/,
    url: 'http://localhost:3000/v1/responses',
    requestHeaders: {},
    method: 'POST',
  } as ReactiveAgentsRequestData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('function_call conversion', () => {
    it('should convert Responses API function_call to tool_calls format', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'get_weather',
        call_id: 'call_123',
        arguments: '{"location": "San Francisco"}',
      };

      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [
            { role: 'user', content: 'What is the weather?' },
            functionCall,
          ],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      // Should render function call card
      expect(screen.getByText('Function Call')).toBeInTheDocument();
      expect(screen.getByText('get_weather')).toBeInTheDocument();
      expect(screen.getByText('call_123')).toBeInTheDocument();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
    });

    it('should handle function_call with string arguments', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'send_email',
        call_id: 'call_456',
        arguments: '{"to": "user@example.com", "subject": "Hello"}',
      };

      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [functionCall],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('send_email')).toBeInTheDocument();
      expect(screen.getByText('call_456')).toBeInTheDocument();
    });

    it('should handle function_call without arguments', () => {
      const functionCall: ResponsesAPIFunctionCall = {
        type: 'function_call',
        name: 'get_time',
        call_id: 'call_789',
        arguments: '{}',
      };

      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [functionCall],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('get_time')).toBeInTheDocument();
      expect(screen.getByText('call_789')).toBeInTheDocument();
    });
  });

  describe('function_call_output conversion', () => {
    it('should convert Responses API function_call_output to tool role message', () => {
      const functionOutput: ResponsesAPIFunctionCallOutput = {
        type: 'function_call_output',
        call_id: 'call_123',
        output: '{"temperature": 72, "condition": "sunny"}',
      };

      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [
            {
              type: 'function_call',
              name: 'get_weather',
              call_id: 'call_123',
            } as ResponsesAPIFunctionCall,
            functionOutput,
          ],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      // Should render tool response card
      expect(screen.getByText('Tool')).toBeInTheDocument();
      expect(screen.getByText('Response')).toBeInTheDocument();
      // There are two cards, so use getAllByText
      const callIds = screen.getAllByText('call_123');
      expect(callIds.length).toBeGreaterThan(0);
    });

    it('should handle function_call_output with object output', () => {
      const functionOutput: ResponsesAPIFunctionCallOutput = {
        type: 'function_call_output',
        call_id: 'call_456',
        output: JSON.stringify({ success: true, data: { id: 123 } }),
      };

      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [functionOutput],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      const callIds = screen.getAllByText('call_456');
      expect(callIds.length).toBeGreaterThan(0);
      // Output should be stringified
      const content = screen.getByText(
        (content) => content.includes('success') && content.includes('data'),
      );
      expect(content).toBeInTheDocument();
    });
  });

  describe('mixed message types', () => {
    it('should handle regular messages alongside Responses API function calls', () => {
      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [
            { role: 'user', content: 'Get the weather' },
            {
              type: 'function_call',
              name: 'get_weather',
              call_id: 'call_123',
              arguments: '{"location": "NYC"}',
            } as ResponsesAPIFunctionCall,
            {
              type: 'function_call_output',
              call_id: 'call_123',
              output: '{"temp": 65}',
            } as ResponsesAPIFunctionCallOutput,
            { role: 'assistant', content: 'The temperature is 65°F' },
          ],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      // User message
      expect(screen.getByText('Get the weather')).toBeInTheDocument();
      // Function call
      expect(screen.getByText('get_weather')).toBeInTheDocument();
      // Function output (appears in both function call and tool response)
      const callIds = screen.getAllByText('call_123');
      expect(callIds.length).toBeGreaterThan(0);
      // Assistant response
      expect(screen.getByText('The temperature is 65°F')).toBeInTheDocument();
    });

    it('should skip reasoning and other non-message types', () => {
      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [
            { role: 'user', content: 'Hello' },
            { type: 'reasoning', summary: ['Thinking...'] }, // Should be skipped
            { role: 'assistant', content: 'Hi there!' },
          ],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      // Reasoning should not appear
      expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
    });
  });

  describe('Chat Completions API compatibility', () => {
    it('should handle standard chat completion messages with tool_calls', () => {
      const requestData = {
        functionName: FunctionName.CHAT_COMPLETE,
        requestBody: {
          model: 'gpt-4',
          messages: [
            { role: 'user', content: 'What is the weather?' },
            {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_abc',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "NYC"}',
                  },
                },
              ],
            },
            {
              role: 'tool',
              content: '{"temp": 70}',
              tool_call_id: 'call_abc',
            },
          ],
        },
        responseSchema: z.object({}),
        requestSchema: z.object({}),
      } as unknown as ReactiveAgentsRequestData;

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('What is the weather?')).toBeInTheDocument();
      expect(screen.getByText('get_weather')).toBeInTheDocument();
      // Multiple elements might have the same call ID
      const callIds = screen.getAllByText('call_abc');
      expect(callIds.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input array', () => {
      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [],
        },
      };

      const { container } = render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      // Should render without errors but show no messages
      // MessagesView returns a fragment, so check that there are no child elements
      expect(container.querySelector('div')).toBeNull();
    });

    it('should handle string input for Responses API', () => {
      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: 'Hello, world!',
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('should handle null and invalid items gracefully', () => {
      const requestData = {
        ...mockRequestData,
        requestBody: {
          model: 'gpt-4',
          input: [
            { role: 'user', content: 'Valid message' },
            null, // Invalid item
            'string-item', // Invalid item (not an object)
            { type: 'unknown' }, // Unknown type
            { role: 'assistant', content: 'Another valid message' },
          ],
        },
      };

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('Valid message')).toBeInTheDocument();
      expect(screen.getByText('Another valid message')).toBeInTheDocument();
    });
  });

  describe('function completions API', () => {
    it('should handle COMPLETE function with prompt', () => {
      const requestData = {
        functionName: FunctionName.COMPLETE,
        requestBody: {
          model: 'gpt-4',
          prompt: 'Complete this sentence...',
        },
        responseSchema: z.object({}),
        requestSchema: z.object({}),
      } as unknown as ReactiveAgentsRequestData;

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('Complete this sentence...')).toBeInTheDocument();
    });

    it('should handle EMBED function with input', () => {
      const requestData = {
        functionName: FunctionName.EMBED,
        requestBody: {
          model: 'text-embedding-ada-002',
          input: 'Embed this text',
        },
        responseSchema: z.object({}),
        requestSchema: z.object({}),
      } as unknown as ReactiveAgentsRequestData;

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('Embed this text')).toBeInTheDocument();
    });

    it('should handle GENERATE_IMAGE function with prompt', () => {
      const requestData = {
        functionName: FunctionName.GENERATE_IMAGE,
        requestBody: {
          model: 'dall-e-3',
          prompt: 'A beautiful sunset',
        },
        responseSchema: z.object({}),
        requestSchema: z.object({}),
      } as unknown as ReactiveAgentsRequestData;

      render(
        <MessagesView
          logId="test-log"
          raRequestData={requestData as unknown as ReactiveAgentsRequestData}
        />,
      );

      expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
    });
  });
});
