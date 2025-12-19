import {
  CodeInterpreter,
  ComputerTool,
  CustomTool,
  FileSearchTool,
  FunctionTool,
  GetResponseRequestBody,
  ImageGeneration,
  ListResponseInputItemsRequestBody,
  ListResponsesRequestBody,
  LocalShell,
  Mcp,
  ResponsesRequestBody,
  WebSearchTool,
} from '@shared/types/api/routes/responses-api/request';
import { describe, expect, it } from 'vitest';

describe('Responses API Request Types', () => {
  describe('Tool Types', () => {
    it('should validate basic function tool', () => {
      const functionTool = {
        type: 'function',
        name: 'get_weather',
        description: 'Get current weather',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
        strict: true,
      };

      expect(() => FunctionTool.parse(functionTool)).not.toThrow();
      const parsed = FunctionTool.parse(functionTool);
      expect(parsed.type).toBe('function');
      expect(parsed.name).toBe('get_weather');
    });

    it('should validate file search tool', () => {
      const fileSearchTool = {
        type: 'file_search',
        vector_store_ids: ['vs_123', 'vs_456'],
        filters: {
          field: 'file_type',
          operator: 'equals',
          value: 'pdf',
        },
        max_num_results: 10,
        ranking_options: {
          ranker: 'default-2024-11-15' as const,
          score_threshold: 0.8,
        },
      };

      expect(() => FileSearchTool.parse(fileSearchTool)).not.toThrow();
      const parsed = FileSearchTool.parse(fileSearchTool);
      expect(parsed.vector_store_ids).toHaveLength(2);
      expect(parsed.max_num_results).toBe(10);
    });

    it('should validate computer tool', () => {
      const computerTool = {
        type: 'computer_use_preview',
        display_height: 1080,
        display_width: 1920,
        environment: 'ubuntu' as const,
      };

      expect(() => ComputerTool.parse(computerTool)).not.toThrow();
      const parsed = ComputerTool.parse(computerTool);
      expect(parsed.environment).toBe('ubuntu');
    });

    it('should validate web search tool', () => {
      const webSearchTool = {
        type: 'web_search_preview',
        search_context_size: 'medium' as const,
        user_location: {
          type: 'approximate' as const,
          city: 'Boston',
          country: 'US',
          region: 'MA',
          timezone: 'America/New_York',
        },
      };

      expect(() => WebSearchTool.parse(webSearchTool)).not.toThrow();
      const parsed = WebSearchTool.parse(webSearchTool);
      expect(parsed.search_context_size).toBe('medium');
      expect(parsed.user_location?.city).toBe('Boston');
    });

    it('should validate image generation tool', () => {
      const imageGenTool = {
        type: 'image_generation',
        partial_images: 3,
      };

      expect(() => ImageGeneration.parse(imageGenTool)).not.toThrow();
      const parsed = ImageGeneration.parse(imageGenTool);
      expect(parsed.partial_images).toBe(3);
    });

    it('should validate MCP tool', () => {
      const mcpTool = {
        type: 'mcp',
        server_label: 'My MCP Server',
        server_url: 'https://mcp.example.com',
        require_approval: 'always' as const,
        headers: {
          Authorization: 'Bearer token123',
          'Custom-Header': 'value',
        },
      };

      expect(() => Mcp.parse(mcpTool)).not.toThrow();
      const parsed = Mcp.parse(mcpTool);
      expect(parsed.server_label).toBe('My MCP Server');
      expect(parsed.headers?.Authorization).toBe('Bearer token123');
    });

    it('should validate custom tool with minimal required fields', () => {
      const minimalTool = {
        type: 'custom',
        name: 'my_custom_tool',
      };

      expect(() => CustomTool.parse(minimalTool)).not.toThrow();
    });

    it('should validate local shell tool', () => {
      const localShellTool = {
        type: 'local_shell',
      };

      expect(() => LocalShell.parse(localShellTool)).not.toThrow();
    });

    it('should validate code interpreter tool', () => {
      const codeInterpreterTool = {
        type: 'code_interpreter',
        container: 'container_123',
      };

      expect(() => CodeInterpreter.parse(codeInterpreterTool)).not.toThrow();
    });

    it('should validate ranking options with auto ranker', () => {
      const tool = {
        type: 'file_search',
        vector_store_ids: ['vs_123'],
        ranking_options: {
          ranker: 'auto' as const,
          score_threshold: 0.5,
        },
      };

      expect(() => FileSearchTool.parse(tool)).not.toThrow();
    });

    it('should validate environment options for computer tool', () => {
      const environments = ['mac', 'windows', 'linux', 'ubuntu', 'browser'];

      environments.forEach((env) => {
        const tool = {
          type: 'computer_use_preview',
          display_height: 1080,
          display_width: 1920,
          environment: env,
        };

        expect(() => ComputerTool.parse(tool)).not.toThrow();
      });
    });

    it('should validate search context size options', () => {
      const sizes = ['low', 'medium', 'high'];

      sizes.forEach((size) => {
        const tool = {
          type: 'web_search_preview',
          search_context_size: size,
        };

        expect(() => WebSearchTool.parse(tool)).not.toThrow();
      });
    });

    it('should validate require approval options for MCP', () => {
      const approvalOptions = ['always', 'never'];

      approvalOptions.forEach((option) => {
        const tool = {
          type: 'mcp',
          server_label: 'Test Server',
          server_url: 'https://test.example.com',
          require_approval: option,
        };

        expect(() => Mcp.parse(tool)).not.toThrow();
      });
    });
  });

  describe('ResponsesRequestBody', () => {
    it('should validate minimal request with string input', () => {
      const minimalRequest = {
        input: 'Hello, how are you?',
        model: 'gpt-4',
      };

      expect(() => ResponsesRequestBody.parse(minimalRequest)).not.toThrow();
      const parsed = ResponsesRequestBody.parse(minimalRequest);
      expect(parsed.input).toBe('Hello, how are you?');
      expect(parsed.model).toBe('gpt-4');
    });

    it('should validate request with message array input', () => {
      const messageRequest = {
        input: [
          {
            role: 'user' as const,
            content: 'What is the weather like?',
          },
          {
            role: 'assistant' as const,
            content: 'I can help you check the weather. What location?',
          },
        ],
        model: 'gpt-4',
      };

      expect(() => ResponsesRequestBody.parse(messageRequest)).not.toThrow();
      const parsed = ResponsesRequestBody.parse(messageRequest);
      expect(Array.isArray(parsed.input)).toBe(true);
    });

    it('should validate request with all optional fields', () => {
      const fullRequest = {
        input: 'Analyze this data',
        model: 'gpt-4',
        background: true,
        include: ['metadata', 'usage'],
        instructions: 'Be thorough and detailed',
        max_output_tokens: 2000,
        metadata: {
          user_id: 'b0c1d2e3-f4a5-4789-9012-3456789abcde',
          session_id: 'sess_789',
          priority: 1,
          experimental: true,
        },
        modalities: ['text', 'image'],
        parallel_tool_calls: true,
        previous_response_id: 'resp_abc123',
        reasoning: {
          effort: 'high' as const,
        },
        reasoning_effort: 'medium' as const,
        store: true,
        stream: false,
        temperature: 0.7,
        text: {
          type: 'text' as const,
        },
        tool_choice: 'auto' as const,
        tools: [
          {
            type: 'function',
            name: 'analyze_data',
            description: 'Analyze the provided data',
            parameters: null,
            strict: null,
          },
        ],
        top_p: 0.9,
        truncation: 'auto' as const,
        user: 'user_123',
      };

      expect(() => ResponsesRequestBody.parse(fullRequest)).not.toThrow();
      const parsed = ResponsesRequestBody.parse(fullRequest);
      expect(parsed.background).toBe(true);
      expect(parsed.temperature).toBe(0.7);
      expect(parsed.metadata?.user_id).toBe(
        'b0c1d2e3-f4a5-4789-9012-3456789abcde',
      );
    });

    it('should validate reasoning effort options', () => {
      const efforts = ['low', 'medium', 'high'];

      efforts.forEach((effort) => {
        const request = {
          input: 'Test',
          model: 'gpt-4',
          reasoning_effort: effort,
        };

        expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      });
    });

    it('should validate tool choice options', () => {
      const choices = [
        'none',
        'auto',
        'required',
        { type: 'function', name: 'specific_tool' },
      ];

      choices.forEach((choice) => {
        const request = {
          input: 'Test',
          model: 'gpt-4',
          tool_choice: choice,
        };

        expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      });
    });

    it('should validate truncation options', () => {
      const truncationOptions = ['auto', 'disabled'];

      truncationOptions.forEach((option) => {
        const request = {
          input: 'Test',
          model: 'gpt-4',
          truncation: option,
        };

        expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      });
    });

    it('should validate metadata with different value types', () => {
      const request = {
        input: 'Test',
        model: 'gpt-4',
        metadata: {
          string_value: 'test',
          number_value: 42,
          boolean_value: true,
        },
      };

      expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      const parsed = ResponsesRequestBody.parse(request);
      expect(parsed.metadata?.string_value).toBe('test');
      expect(parsed.metadata?.number_value).toBe(42);
      expect(parsed.metadata?.boolean_value).toBe(true);
    });

    it('should reject invalid metadata value types', () => {
      const request = {
        input: 'Test',
        model: 'gpt-4',
        metadata: {
          invalid_value: { nested: 'object' }, // objects not allowed
        },
      };

      expect(() => ResponsesRequestBody.parse(request)).toThrow();
    });

    it('should validate temperature range', () => {
      const validTemperatures = [0, 0.5, 1.0];

      validTemperatures.forEach((temp) => {
        const request = {
          input: 'Test',
          model: 'gpt-4',
          temperature: temp,
        };

        expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      });
    });

    it('should validate top_p range', () => {
      const validTopP = [0, 0.5, 1.0];

      validTopP.forEach((topP) => {
        const request = {
          input: 'Test',
          model: 'gpt-4',
          top_p: topP,
        };

        expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      });
    });
  });

  describe('ListResponsesRequestBody', () => {
    it('should validate empty list request', () => {
      const emptyRequest = {};

      expect(() => ListResponsesRequestBody.parse(emptyRequest)).not.toThrow();
    });

    it('should validate list request with all parameters', () => {
      const fullRequest = {
        after: 'resp_123',
        before: 'resp_456',
        limit: 50,
        order: 'asc' as const,
      };

      expect(() => ListResponsesRequestBody.parse(fullRequest)).not.toThrow();
      const parsed = ListResponsesRequestBody.parse(fullRequest);
      expect(parsed.limit).toBe(50);
      expect(parsed.order).toBe('asc');
    });

    it('should apply default values', () => {
      const request = {};

      const parsed = ListResponsesRequestBody.parse(request);
      expect(parsed.limit).toBe(20); // default value
      expect(parsed.order).toBe('desc'); // default value
    });

    it('should validate limit bounds', () => {
      const validLimits = [1, 50, 100];

      validLimits.forEach((limit) => {
        const request = { limit };
        expect(() => ListResponsesRequestBody.parse(request)).not.toThrow();
      });
    });

    it('should reject invalid limit values', () => {
      const invalidLimits = [0, 101, -1];

      invalidLimits.forEach((limit) => {
        const request = { limit };
        expect(() => ListResponsesRequestBody.parse(request)).toThrow();
      });
    });

    it('should validate order values', () => {
      const validOrders = ['asc', 'desc'];

      validOrders.forEach((order) => {
        const request = { order };
        expect(() => ListResponsesRequestBody.parse(request)).not.toThrow();
      });
    });
  });

  describe('ListResponseInputItemsRequestBody', () => {
    it('should validate input items list request', () => {
      const request = {
        after: 'item_123',
        before: 'item_456',
        limit: 25,
        order: 'desc' as const,
      };

      expect(() =>
        ListResponseInputItemsRequestBody.parse(request),
      ).not.toThrow();
      const parsed = ListResponseInputItemsRequestBody.parse(request);
      expect(parsed.limit).toBe(25);
    });

    it('should apply default values for input items', () => {
      const request = {};

      const parsed = ListResponseInputItemsRequestBody.parse(request);
      expect(parsed.limit).toBe(20);
      expect(parsed.order).toBe('desc');
    });
  });

  describe('GetResponseRequestBody', () => {
    it('should validate empty get request', () => {
      const emptyRequest = {};

      expect(() => GetResponseRequestBody.parse(emptyRequest)).not.toThrow();
    });

    it('should validate get request with include fields', () => {
      const request = {
        include: ['metadata', 'usage', 'tools'],
      };

      expect(() => GetResponseRequestBody.parse(request)).not.toThrow();
      const parsed = GetResponseRequestBody.parse(request);
      expect(parsed.include).toHaveLength(3);
    });

    it('should handle optional include field', () => {
      const request = {};

      const parsed = GetResponseRequestBody.parse(request);
      expect(parsed.include).toBeUndefined();
    });
  });

  describe('Complex tool scenarios', () => {
    it('should validate multiple tools in request', () => {
      const request = {
        input: 'Process this data with multiple tools',
        model: 'gpt-4',
        tools: [
          {
            type: 'function',
            name: 'analyze_data',
            description: 'Analyze data',
            parameters: null,
            strict: null,
          },
          {
            type: 'file_search',
            vector_store_ids: ['vs_123'],
            max_num_results: 5,
          },
          {
            type: 'computer_use_preview',
            display_height: 720,
            display_width: 1280,
            environment: 'mac' as const,
          },
        ],
      };

      expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
      const parsed = ResponsesRequestBody.parse(request);
      expect(parsed.tools).toHaveLength(3);
    });

    it('should handle empty tools array', () => {
      const request = {
        input: 'Simple request',
        model: 'gpt-4',
        tools: [],
      };

      expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long input string', () => {
      const longInput = 'A'.repeat(10000);
      const request = {
        input: longInput,
        model: 'gpt-4',
      };

      expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
    });

    it('should handle large message array', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
      }));

      const request = {
        input: messages,
        model: 'gpt-4',
      };

      expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
    });

    it('should handle special characters in metadata', () => {
      const request = {
        input: 'Test',
        model: 'gpt-4',
        metadata: {
          'special-key': 'value with spaces',
          'unicode_🚀': 'rocket',
          number_key: 42,
        },
      };

      expect(() => ResponsesRequestBody.parse(request)).not.toThrow();
    });
  });
});
