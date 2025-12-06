import { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import { describe, expect, it } from 'vitest';

describe('Chat Completions API Request Types', () => {
  describe('ChatCompletionRequestBody', () => {
    it('should validate minimal request with required fields', () => {
      const minimalRequest = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello, world!',
          },
        ],
      };

      expect(() =>
        ChatCompletionRequestBody.parse(minimalRequest),
      ).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(minimalRequest);
      expect(parsed.model).toBe('gpt-4');
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.messages[0].role).toBe('user');
      expect(parsed.messages[0].content).toBe('Hello, world!');
    });

    it('should validate request with system and user messages', () => {
      const request = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'What is the weather like?',
          },
          {
            role: 'assistant',
            content:
              'I can help you check the weather. What location would you like to know about?',
          },
          {
            role: 'user',
            content: 'San Francisco',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.messages).toHaveLength(4);
      expect(parsed.messages[0].role).toBe('system');
      expect(parsed.messages[1].role).toBe('user');
      expect(parsed.messages[2].role).toBe('assistant');
    });

    it('should validate request with function tools', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'What is the weather in San Francisco?',
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get current weather for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'The city and state, e.g. San Francisco, CA',
                  },
                  unit: {
                    type: 'string',
                    enum: ['celsius', 'fahrenheit'],
                  },
                },
                required: ['location'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.tools).toHaveLength(1);
      expect(parsed.tools![0].type).toBe('function');
      expect(parsed.tool_choice).toBe('auto');
    });

    it('should validate request with deprecated functions field', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Calculate 2 + 2',
          },
        ],
        functions: [
          {
            name: 'calculate',
            description: 'Perform a calculation',
            parameters: {
              type: 'object',
              properties: {
                expression: { type: 'string' },
              },
              required: ['expression'],
            },
          },
        ],
        function_call: 'auto',
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.functions).toHaveLength(1);
      expect(parsed.function_call).toBe('auto');
    });

    it('should validate request with specific function call', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Call the weather function',
          },
        ],
        functions: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        ],
        function_call: { name: 'get_weather' },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.function_call).toEqual({ name: 'get_weather' });
    });

    it('should validate temperature parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.7,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.temperature).toBe(0.7);
    });

    it('should validate top_p parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        top_p: 0.9,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.top_p).toBe(0.9);
    });

    it('should validate max_tokens parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1000,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.max_tokens).toBe(1000);
    });

    it('should validate max_completion_tokens parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        max_completion_tokens: 2000,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.max_completion_tokens).toBe(2000);
    });

    it('should validate stream parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        stream: true,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.stream).toBe(true);
    });

    it('should validate stop sequences as string', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        stop: 'STOP',
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.stop).toBe('STOP');
    });

    it('should validate stop sequences as array', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        stop: ['STOP', 'END', '\n\n'],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.stop).toEqual(['STOP', 'END', '\n\n']);
    });

    it('should validate presence and frequency penalties', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        presence_penalty: 0.5,
        frequency_penalty: -0.3,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.presence_penalty).toBe(0.5);
      expect(parsed.frequency_penalty).toBe(-0.3);
    });

    it('should validate logit bias', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        logit_bias: {
          '1212': -100,
          '1213': 100,
        },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.logit_bias).toEqual({ '1212': -100, '1213': 100 });
    });

    it('should validate user identifier', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        user: 'user-123',
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.user).toBe('user-123');
    });

    it('should validate response format for JSON object', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Return JSON' }],
        response_format: { type: 'json_object' },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.response_format?.type).toBe('json_object');
    });

    it('should validate response format for JSON schema', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Return structured data' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'math_response',
            schema: {
              type: 'object',
              properties: {
                answer: { type: 'number' },
                explanation: { type: 'string' },
              },
              required: ['answer'],
            },
            strict: true,
          },
        },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.response_format?.type).toBe('json_schema');
      expect(parsed.response_format?.json_schema).toBeDefined();
    });

    it('should validate seed parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        seed: 42,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.seed).toBe(42);
    });

    it('should validate store parameter', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        store: true,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.store).toBe(true);
    });

    it('should validate metadata', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        metadata: {
          user_id: 'user-123',
          session_id: 'session-456',
          tags: ['test', 'api'],
        },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.metadata).toEqual({
        user_id: 'user-123',
        session_id: 'session-456',
        tags: ['test', 'api'],
      });
    });

    it('should validate modalities', () => {
      const request = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Generate audio' }],
        modalities: ['text', 'audio'],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.modalities).toEqual(['text', 'audio']);
    });

    it('should validate audio configuration', () => {
      const request = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Speak this' }],
        modalities: ['text', 'audio'],
        audio: {
          voice: 'alloy',
          format: 'wav',
        },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.audio?.voice).toBe('alloy');
      expect(parsed.audio?.format).toBe('wav');
    });

    it('should validate service tier', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        service_tier: 'scale',
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.service_tier).toBe('scale');
    });

    it('should validate prediction configuration', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        prediction: {
          type: 'content',
          content: {
            type: 'text',
            text: 'Expected completion...',
          },
        },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.prediction?.type).toBe('content');
    });

    it('should validate logprobs parameters', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        logprobs: true,
        top_logprobs: 5,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.logprobs).toBe(true);
      expect(parsed.top_logprobs).toBe(5);
    });

    it('should validate parallel tool calls', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Use multiple tools' }],
        tools: [
          {
            type: 'function',
            function: { name: 'tool1', parameters: {} },
          },
          {
            type: 'function',
            function: { name: 'tool2', parameters: {} },
          },
        ],
        parallel_tool_calls: false,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.parallel_tool_calls).toBe(false);
    });

    it('should validate provider-specific parameters', () => {
      const request = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Test' }],
        anthropic_beta: 'max-tokens-3-5-sonnet-2024-07-15',
        anthropic_version: '2023-06-01',
        thinking: {
          type: 'thinking',
          budget_tokens: 1000,
          include: ['reasoning'],
        },
        safety_settings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.anthropic_beta).toBe('max-tokens-3-5-sonnet-2024-07-15');
      expect(parsed.anthropic_version).toBe('2023-06-01');
      expect(parsed.thinking).toBeDefined();
      expect(parsed.safety_settings).toBeDefined();
    });

    it('should validate complete request with all optional parameters', () => {
      const request = {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'Analyze this data and provide insights.',
          },
        ],
        functions: [
          {
            name: 'analyze_data',
            description: 'Analyze data',
            parameters: {
              type: 'object',
              properties: {
                data: { type: 'array' },
              },
            },
          },
        ],
        function_call: 'auto',
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_insights',
              description: 'Get insights from data',
              parameters: {
                type: 'object',
                properties: {
                  data: { type: 'array' },
                  analysis_type: { type: 'string' },
                },
                required: ['data'],
              },
            },
          },
        ],
        tool_choice: 'required',
        max_tokens: 2000,
        max_completion_tokens: 1500,
        temperature: 0.8,
        top_p: 0.95,
        n: 2,
        stream: false,
        stop: ['STOP', 'END'],
        presence_penalty: 0.1,
        frequency_penalty: -0.1,
        logit_bias: { '1212': 50 },
        user: 'user-789',
        response_format: { type: 'text' },
        seed: 123,
        store: false,
        metadata: {
          experiment: 'test-v1',
          version: '1.0',
        },
        modalities: ['text'],
        service_tier: 'default',
        logprobs: true,
        top_logprobs: 3,
        parallel_tool_calls: true,
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.model).toBe('gpt-4-turbo');
      expect(parsed.messages).toHaveLength(2);
      expect(parsed.functions).toHaveLength(1);
      expect(parsed.tools).toHaveLength(1);
      expect(parsed.temperature).toBe(0.8);
      expect(parsed.n).toBe(2);
    });

    it('should validate tool choice with specific function', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Call weather function' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'get_weather' },
        },
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.tool_choice).toEqual({
        type: 'function',
        function: { name: 'get_weather' },
      });
    });

    it('should validate message with tool calls', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'What is the weather?',
          },
          {
            role: 'assistant',
            content: "I'll check the weather for you.",
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"location": "San Francisco"}',
                },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: 'call_123',
            content: 'The weather is sunny, 72°F',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.messages).toHaveLength(3);
      expect(parsed.messages[1].tool_calls).toHaveLength(1);
      expect(parsed.messages[2].role).toBe('tool');
    });
  });

  describe('MCP Servers Support', () => {
    it('should validate request with MCP servers', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello, world!',
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: 'https://example-server.modelcontextprotocol.io/sse',
            name: 'example-mcp',
            authorization_token: 'YOUR_TOKEN',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.mcp_servers).toBeDefined();
      expect(parsed.mcp_servers).toHaveLength(1);
      expect(parsed.mcp_servers![0].type).toBe('url');
      expect(parsed.mcp_servers![0].url).toBe(
        'https://example-server.modelcontextprotocol.io/sse',
      );
      expect(parsed.mcp_servers![0].name).toBe('example-mcp');
      expect(parsed.mcp_servers![0].authorization_token).toBe('YOUR_TOKEN');
    });

    it('should validate request with multiple MCP servers', () => {
      const request = {
        model: 'claude-3-sonnet-20240229',
        messages: [
          {
            role: 'user',
            content: 'Help me with data analysis',
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: 'https://data-server.modelcontextprotocol.io/sse',
            name: 'data-server',
            authorization_token: 'DATA_TOKEN',
          },
          {
            type: 'url',
            url: 'https://analytics-server.modelcontextprotocol.io/sse',
            name: 'analytics-server',
            authorization_token: 'ANALYTICS_TOKEN',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.mcp_servers).toHaveLength(2);
      expect(parsed.mcp_servers![0].name).toBe('data-server');
      expect(parsed.mcp_servers![1].name).toBe('analytics-server');
    });

    it('should validate request with minimal MCP server (only required fields)', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello!',
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: 'https://minimal-server.modelcontextprotocol.io/sse',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.mcp_servers).toHaveLength(1);
      expect(parsed.mcp_servers![0].type).toBe('url');
      expect(parsed.mcp_servers![0].url).toBe(
        'https://minimal-server.modelcontextprotocol.io/sse',
      );
      expect(parsed.mcp_servers![0].name).toBeUndefined();
      expect(parsed.mcp_servers![0].authorization_token).toBeUndefined();
    });

    it('should validate request without MCP servers (backward compatibility)', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello, world!',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).not.toThrow();
      const parsed = ChatCompletionRequestBody.parse(request);
      expect(parsed.mcp_servers).toBeUndefined();
    });

    it('should reject invalid MCP server URL', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello!',
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: 'invalid-url',
            name: 'invalid-server',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).toThrow();
    });

    it('should reject MCP server without required type field', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello!',
          },
        ],
        mcp_servers: [
          {
            url: 'https://example-server.modelcontextprotocol.io/sse',
            name: 'missing-type',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).toThrow();
    });

    it('should reject MCP server without required url field', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello!',
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            name: 'missing-url',
          },
        ],
      };

      expect(() => ChatCompletionRequestBody.parse(request)).toThrow();
    });
  });
});
