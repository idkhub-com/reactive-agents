import {
  ResponsesAPIFunctionCall,
  ResponsesResponseBody,
} from '@shared/types/api/routes/responses-api/response';
import { describe, expect, it } from 'vitest';

describe('Responses API Schema Validation', () => {
  describe('ResponsesAPIFunctionCall Type Validation', () => {
    it('should accept type "function"', () => {
      const functionCall = {
        arguments: '{"operation":"add","a":1,"b":2}',
        call_id: 'call_123',
        name: 'calculate',
        type: 'function',
      };

      const result = ResponsesAPIFunctionCall.safeParse(functionCall);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('function');
      }
    });

    it('should accept type "function_call"', () => {
      const functionCall = {
        arguments: '{"operation":"add","a":1,"b":2}',
        call_id: 'call_123',
        name: 'calculate',
        type: 'function_call',
      };

      const result = ResponsesAPIFunctionCall.safeParse(functionCall);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('function_call');
      }
    });

    it('should reject invalid type', () => {
      const functionCall = {
        arguments: '{"operation":"add","a":1,"b":2}',
        call_id: 'call_123',
        name: 'calculate',
        type: 'invalid_type',
      };

      const result = ResponsesAPIFunctionCall.safeParse(functionCall);
      expect(result.success).toBe(false);
    });

    it('should validate complete function_call with all fields', () => {
      const functionCall = {
        arguments: '{"operation":"multiply","a":15,"b":8}',
        call_id: 'call_abc123',
        name: 'calculate',
        type: 'function_call',
      };

      const result = ResponsesAPIFunctionCall.safeParse(functionCall);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('calculate');
        expect(result.data.call_id).toBe('call_abc123');
        expect(result.data.type).toBe('function_call');
        expect(JSON.parse(result.data.arguments)).toEqual({
          operation: 'multiply',
          a: 15,
          b: 8,
        });
      }
    });
  });

  describe('Reasoning Effort Validation', () => {
    it('should accept reasoning.effort "minimal"', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: {
          effort: 'minimal',
          summary: null,
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoning?.effort).toBe('minimal');
      }
    });

    it('should accept reasoning.effort "medium"', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: {
          effort: 'medium',
          summary: null,
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoning?.effort).toBe('medium');
      }
    });

    it('should accept reasoning.effort "high"', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: {
          effort: 'high',
          summary: null,
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoning?.effort).toBe('high');
      }
    });

    it('should accept reasoning_effort "minimal" at root level', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: null,
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: 'minimal',
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoning_effort).toBe('minimal');
      }
    });

    it('should reject invalid reasoning.effort value', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: {
          effort: 'invalid_effort',
          summary: null,
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('Reasoning Null Handling', () => {
    it('should accept reasoning as null', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: null,
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoning).toBeNull();
      }
    });

    it('should accept reasoning.effort as null', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: {
          effort: null,
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept reasoning.effort as undefined', () => {
      const response = {
        id: 'resp_123',
        object: 'response',
        created_at: 1234567890,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [],
        reasoning: {},
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('Complete Response with Function Call', () => {
    it('should validate response with function_call in output', () => {
      const response = {
        id: 'resp_abc123',
        object: 'response',
        created_at: 1763980623,
        model: 'gpt-5-nano-2025-08-07',
        status: 'completed',
        output: [
          {
            id: 'msg-123',
            type: 'message',
            role: 'assistant',
            content: [],
            status: 'completed',
          },
          {
            type: 'function_call',
            id: 'call_123',
            call_id: 'call_123',
            name: 'calculate',
            arguments: '{"operation":"multiply","a":15,"b":8}',
            status: 'completed',
          },
        ],
        reasoning: {
          effort: 'minimal',
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toHaveLength(2);
        expect(result.data.reasoning?.effort).toBe('minimal');

        // Verify the function_call output item
        const functionCallItem = result.data.output[1] as Record<
          string,
          unknown
        >;
        expect(functionCallItem.type).toBe('function_call');
        expect(functionCallItem.name).toBe('calculate');
        expect(functionCallItem.call_id).toBe('call_123');
        expect(functionCallItem.arguments).toBe(
          '{"operation":"multiply","a":15,"b":8}',
        );
      }
    });

    it('should validate response with multiple function_calls', () => {
      const response = {
        id: 'resp_multi',
        object: 'response',
        created_at: 1763980623,
        model: 'gpt-5-nano',
        status: 'completed',
        output: [
          {
            type: 'function_call',
            id: 'call_1',
            call_id: 'call_1',
            name: 'calculate',
            arguments: '{"operation":"multiply","a":15,"b":8}',
            status: 'completed',
          },
          {
            type: 'function_call',
            id: 'call_2',
            call_id: 'call_2',
            name: 'format',
            arguments: '{"result":120}',
            status: 'completed',
          },
        ],
        reasoning: {
          effort: 'high',
        },
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output_text: null,
        parallel_tool_calls: null,
        previous_response_id: null,
        reasoning_effort: null,
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toHaveLength(2);
        expect(result.data.reasoning?.effort).toBe('high');

        const fc1 = result.data.output[0] as Record<string, unknown>;
        expect(fc1.name).toBe('calculate');
        expect(fc1.type).toBe('function_call');

        const fc2 = result.data.output[1] as Record<string, unknown>;
        expect(fc2.name).toBe('format');
        expect(fc2.type).toBe('function_call');
      }
    });
  });
});
