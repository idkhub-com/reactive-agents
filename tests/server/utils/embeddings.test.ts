import {
  extractMessagesFromRequestData,
  formatMessagesForEmbedding,
  RequestEmbeddingError,
} from '@server/utils/embeddings';
import { FunctionName } from '@shared/types/api/request';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { describe, expect, it } from 'vitest';

describe('Embeddings Utility', () => {
  describe('RequestEmbeddingError', () => {
    it('should create error with correct name and message', () => {
      const error = new RequestEmbeddingError('Test error message');
      expect(error.name).toBe('RequestEmbeddingError');
      expect(error.message).toBe('Test error message');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('extractMessagesFromRequestData', () => {
    it('should extract messages from chat completion request', () => {
      const requestData = {
        functionName: FunctionName.CHAT_COMPLETE,
        requestBody: {
          messages: [
            { role: ChatCompletionMessageRole.USER, content: 'Hello' },
            { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi there' },
          ],
        },
      };

      const result = extractMessagesFromRequestData(requestData as never);
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Hello');
      expect(result[1].content).toBe('Hi there');
    });

    it('should extract messages from stream chat completion request', () => {
      const requestData = {
        functionName: FunctionName.STREAM_CHAT_COMPLETE,
        requestBody: {
          messages: [
            { role: ChatCompletionMessageRole.USER, content: 'Stream test' },
          ],
        },
      };

      const result = extractMessagesFromRequestData(requestData as never);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Stream test');
    });

    it('should extract messages from responses API with string input', () => {
      const requestData = {
        functionName: FunctionName.CREATE_MODEL_RESPONSE,
        requestBody: {
          input: 'Simple string input',
        },
      };

      const result = extractMessagesFromRequestData(requestData as never);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(ChatCompletionMessageRole.USER);
      expect(result[0].content).toBe('Simple string input');
    });

    it('should extract messages from responses API with array input', () => {
      const requestData = {
        functionName: FunctionName.CREATE_MODEL_RESPONSE,
        requestBody: {
          input: [
            { role: 'user', content: 'User message' },
            { role: 'assistant', content: 'Assistant message' },
          ],
        },
      };

      const result = extractMessagesFromRequestData(requestData as never);
      expect(result).toHaveLength(2);
    });
  });

  describe('formatMessagesForEmbedding', () => {
    it('should format user messages correctly', () => {
      const messages = [
        { role: ChatCompletionMessageRole.USER, content: 'Hello world' },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toBe('User: Hello world');
    });

    it('should format assistant messages correctly', () => {
      const messages = [
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi there' },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toBe('Assistant: Hi there');
    });

    it('should exclude system messages from embedding', () => {
      const messages = [
        { role: ChatCompletionMessageRole.SYSTEM, content: 'System prompt' },
        { role: ChatCompletionMessageRole.USER, content: 'User message' },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toBe('User: User message');
      expect(result).not.toContain('System prompt');
    });

    it('should exclude developer messages from embedding', () => {
      const messages = [
        {
          role: ChatCompletionMessageRole.DEVELOPER,
          content: 'Developer message',
        },
        { role: ChatCompletionMessageRole.USER, content: 'User message' },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toBe('User: User message');
      expect(result).not.toContain('Developer message');
    });

    it('should format multiple messages with separators', () => {
      const messages = [
        { role: ChatCompletionMessageRole.USER, content: 'First message' },
        {
          role: ChatCompletionMessageRole.ASSISTANT,
          content: 'Second message',
        },
        { role: ChatCompletionMessageRole.USER, content: 'Third message' },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toContain('User: First message');
      expect(result).toContain('Assistant: Second message');
      expect(result).toContain('User: Third message');
      expect(result).toContain('\n\n\n');
    });

    it('should handle array content', () => {
      const messages = [
        {
          role: ChatCompletionMessageRole.USER,
          content: [{ text: 'Part 1' }, { text: 'Part 2' }],
        },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toBe('User: Part 1 Part 2');
    });

    it('should skip messages with empty content', () => {
      const messages = [
        { role: ChatCompletionMessageRole.USER, content: '' },
        { role: ChatCompletionMessageRole.USER, content: 'Valid message' },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toBe('User: Valid message');
    });

    it('should format tool calls in assistant messages', () => {
      const messages = [
        {
          role: ChatCompletionMessageRole.ASSISTANT,
          content: '',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location": "NYC"}',
              },
            },
          ],
        },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toContain('Assistant Tool Calls');
      expect(result).toContain('get_weather');
      expect(result).toContain('call_123');
    });

    it('should format tool response messages', () => {
      const messages = [
        {
          role: ChatCompletionMessageRole.TOOL,
          tool_call_id: 'call_123',
          content: 'Weather result',
        },
      ];

      const result = formatMessagesForEmbedding(messages);
      expect(result).toContain('Tool Call call_123 Output');
    });
  });
});
