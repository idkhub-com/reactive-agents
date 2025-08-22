import {
  ChatCompletionChoice,
  ChatCompletionChoiceLogprobs,
  ChatCompletionChunk,
  ChatCompletionFinishReason,
  ChatCompletionResponseBody,
  ChatCompletionTokenLogprob,
  ChatCompletionUsage,
} from '@shared/types/api/routes/chat-completions-api/response';
import { describe, expect, it } from 'vitest';

describe('Chat Completion Response Types', () => {
  describe('ChatCompletionTokenLogprob', () => {
    it('should validate valid token logprob', () => {
      const validLogprob = {
        token: 'hello',
        logprob: -0.5,
        bytes: [72, 101, 108, 108, 111],
        top_logprobs: [
          {
            token: 'hello',
            logprob: -0.5,
            bytes: [72, 101, 108, 108, 111],
          },
          {
            token: 'hi',
            logprob: -1.2,
          },
        ],
      };

      expect(() =>
        ChatCompletionTokenLogprob.parse(validLogprob),
      ).not.toThrow();
      const parsed = ChatCompletionTokenLogprob.parse(validLogprob);
      expect(parsed).toEqual(validLogprob);
    });

    it('should validate minimal token logprob', () => {
      const minimalLogprob = {
        token: 'hi',
        logprob: -0.1,
      };

      expect(() =>
        ChatCompletionTokenLogprob.parse(minimalLogprob),
      ).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidLogprob = {
        token: 'hello',
        // missing logprob
      };

      expect(() => ChatCompletionTokenLogprob.parse(invalidLogprob)).toThrow();
    });

    it('should reject invalid types', () => {
      const invalidLogprob = {
        token: 'hello',
        logprob: 'invalid-number',
      };

      expect(() => ChatCompletionTokenLogprob.parse(invalidLogprob)).toThrow();
    });
  });

  describe('ChatCompletionChoiceLogprobs', () => {
    it('should validate valid choice logprobs', () => {
      const validLogprobs = {
        content: [
          {
            token: 'Hello',
            logprob: -0.1,
          },
        ],
        refusal: null,
      };

      expect(() =>
        ChatCompletionChoiceLogprobs.parse(validLogprobs),
      ).not.toThrow();
      const parsed = ChatCompletionChoiceLogprobs.parse(validLogprobs);
      expect(parsed.content).toHaveLength(1);
      expect(parsed.refusal).toBe(null);
    });

    it('should accept null content', () => {
      const logprobs = {
        content: null,
        refusal: null,
      };

      expect(() => ChatCompletionChoiceLogprobs.parse(logprobs)).not.toThrow();
    });

    it('should handle optional refusal field', () => {
      const logprobs = {
        content: [],
      };

      expect(() => ChatCompletionChoiceLogprobs.parse(logprobs)).not.toThrow();
    });
  });

  describe('ChatCompletionFinishReason', () => {
    it('should validate all finish reason values', () => {
      const validReasons = [
        'stop',
        'length',
        'tool_calls',
        'content_filter',
        'function_call',
      ];

      validReasons.forEach((reason) => {
        expect(Object.values(ChatCompletionFinishReason)).toContain(reason);
      });
    });
  });

  describe('ChatCompletionChoice', () => {
    it('should validate valid choice', () => {
      const validChoice = {
        finish_reason: ChatCompletionFinishReason.STOP,
        index: 0,
        message: {
          role: 'assistant' as const,
          content: 'Hello, how can I help you?',
        },
        logprobs: {
          content: null,
          refusal: null,
        },
      };

      expect(() => ChatCompletionChoice.parse(validChoice)).not.toThrow();
      const parsed = ChatCompletionChoice.parse(validChoice);
      expect(parsed.index).toBe(0);
      expect(parsed.finish_reason).toBe('stop');
    });

    it('should accept null finish_reason', () => {
      const choice = {
        finish_reason: null,
        index: 1,
        message: {
          role: 'assistant' as const,
          content: 'Test message',
        },
      };

      expect(() => ChatCompletionChoice.parse(choice)).not.toThrow();
    });

    it('should handle optional logprobs', () => {
      const choice = {
        finish_reason: ChatCompletionFinishReason.LENGTH,
        index: 0,
        message: {
          role: 'assistant' as const,
          content: 'Test',
        },
      };

      expect(() => ChatCompletionChoice.parse(choice)).not.toThrow();
    });

    it('should reject invalid index type', () => {
      const invalidChoice = {
        finish_reason: ChatCompletionFinishReason.STOP,
        index: 'invalid',
        message: {
          role: 'assistant' as const,
          content: 'Test',
        },
      };

      expect(() => ChatCompletionChoice.parse(invalidChoice)).toThrow();
    });
  });

  describe('ChatCompletionUsage', () => {
    it('should validate basic usage stats', () => {
      const validUsage = {
        completion_tokens: 50,
        prompt_tokens: 20,
        total_tokens: 70,
      };

      expect(() => ChatCompletionUsage.parse(validUsage)).not.toThrow();
      const parsed = ChatCompletionUsage.parse(validUsage);
      expect(parsed.total_tokens).toBe(70);
    });

    it('should handle optional completion_tokens_details', () => {
      const usage = {
        completion_tokens: 50,
        prompt_tokens: 20,
        total_tokens: 70,
        completion_tokens_details: {
          audio_tokens: 10,
          reasoning_tokens: 5,
        },
      };

      expect(() => ChatCompletionUsage.parse(usage)).not.toThrow();
      const parsed = ChatCompletionUsage.parse(usage);
      expect(parsed.completion_tokens_details?.audio_tokens).toBe(10);
    });

    it('should handle optional prompt_tokens_details', () => {
      const usage = {
        completion_tokens: 50,
        prompt_tokens: 20,
        total_tokens: 70,
        prompt_tokens_details: {
          audio_tokens: 5,
          cached_tokens: 15,
        },
      };

      expect(() => ChatCompletionUsage.parse(usage)).not.toThrow();
      const parsed = ChatCompletionUsage.parse(usage);
      expect(parsed.prompt_tokens_details?.cached_tokens).toBe(15);
    });

    it('should reject negative token counts', () => {
      const invalidUsage = {
        completion_tokens: -10,
        prompt_tokens: 20,
        total_tokens: 70,
      };

      expect(() => ChatCompletionUsage.parse(invalidUsage)).toThrow();
    });
  });

  describe('ChatCompletionResponseBody', () => {
    it('should validate complete response body', () => {
      const validResponse = {
        id: 'chatcmpl-123',
        choices: [
          {
            finish_reason: ChatCompletionFinishReason.STOP,
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Hello!',
            },
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
        system_fingerprint: 'fp_123',
        usage: {
          completion_tokens: 5,
          prompt_tokens: 10,
          total_tokens: 15,
        },
        service_tier: 'default' as const,
      };

      expect(() =>
        ChatCompletionResponseBody.parse(validResponse),
      ).not.toThrow();
      const parsed = ChatCompletionResponseBody.parse(validResponse);
      expect(parsed.id).toBe('chatcmpl-123');
      expect(parsed.choices).toHaveLength(1);
    });

    it('should transform created timestamp from milliseconds to seconds', () => {
      const response = {
        id: 'chatcmpl-123',
        choices: [
          {
            finish_reason: ChatCompletionFinishReason.STOP,
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Hello!',
            },
          },
        ],
        created: 1677652288000, // milliseconds
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
      };

      const parsed = ChatCompletionResponseBody.parse(response);
      expect(parsed.created).toBe(1677652288); // should be converted to seconds
    });

    it('should keep created timestamp in seconds unchanged', () => {
      const response = {
        id: 'chatcmpl-123',
        choices: [],
        created: 1677652288, // already in seconds
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
      };

      const parsed = ChatCompletionResponseBody.parse(response);
      expect(parsed.created).toBe(1677652288);
    });

    it('should handle optional fields', () => {
      const minimalResponse = {
        id: 'chatcmpl-123',
        choices: [],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
      };

      expect(() =>
        ChatCompletionResponseBody.parse(minimalResponse),
      ).not.toThrow();
    });

    it('should accept null system_fingerprint', () => {
      const response = {
        id: 'chatcmpl-123',
        choices: [],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
        system_fingerprint: null,
      };

      expect(() => ChatCompletionResponseBody.parse(response)).not.toThrow();
    });

    it('should reject invalid object type', () => {
      const invalidResponse = {
        id: 'chatcmpl-123',
        choices: [],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'invalid.object',
      };

      expect(() => ChatCompletionResponseBody.parse(invalidResponse)).toThrow();
    });

    it('should validate service_tier values', () => {
      const validTiers = ['scale', 'default'];

      validTiers.forEach((tier) => {
        const response = {
          id: 'chatcmpl-123',
          choices: [],
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          object: 'chat.completion' as const,
          service_tier: tier,
        };

        expect(() => ChatCompletionResponseBody.parse(response)).not.toThrow();
      });
    });
  });

  describe('ChatCompletionChunk', () => {
    it('should validate streaming chunk', () => {
      const validChunk = {
        id: 'chatcmpl-123',
        choices: [
          {
            delta: {
              content: 'Hello',
              role: 'assistant' as const,
            },
            finish_reason: null,
            index: 0,
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk' as const,
      };

      expect(() => ChatCompletionChunk.parse(validChunk)).not.toThrow();
      const parsed = ChatCompletionChunk.parse(validChunk);
      expect(parsed.object).toBe('chat.completion.chunk');
    });

    it('should handle delta with tool calls', () => {
      const chunk = {
        id: 'chatcmpl-123',
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_123',
                  type: 'function' as const,
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "Boston"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls' as const,
            index: 0,
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk' as const,
      };

      expect(() => ChatCompletionChunk.parse(chunk)).not.toThrow();
    });

    it('should handle deprecated function_call', () => {
      const chunk = {
        id: 'chatcmpl-123',
        choices: [
          {
            delta: {
              function_call: {
                name: 'get_weather',
                arguments: '{"location": "Boston"}',
              },
            },
            finish_reason: 'function_call' as const,
            index: 0,
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk' as const,
      };

      expect(() => ChatCompletionChunk.parse(chunk)).not.toThrow();
    });

    it('should handle refusal in delta', () => {
      const chunk = {
        id: 'chatcmpl-123',
        choices: [
          {
            delta: {
              refusal: 'I cannot help with that request.',
            },
            finish_reason: 'content_filter' as const,
            index: 0,
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk' as const,
      };

      expect(() => ChatCompletionChunk.parse(chunk)).not.toThrow();
    });

    it('should include usage in final chunk when specified', () => {
      const chunk = {
        id: 'chatcmpl-123',
        choices: [
          {
            delta: {},
            finish_reason: 'stop' as const,
            index: 0,
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk' as const,
        usage: {
          completion_tokens: 10,
          prompt_tokens: 5,
          total_tokens: 15,
        },
      };

      expect(() => ChatCompletionChunk.parse(chunk)).not.toThrow();
      const parsed = ChatCompletionChunk.parse(chunk);
      expect(parsed.usage?.total_tokens).toBe(15);
    });

    it('should handle optional logprobs in chunks', () => {
      const chunk = {
        id: 'chatcmpl-123',
        choices: [
          {
            delta: {
              content: 'test',
            },
            logprobs: {
              content: [
                {
                  token: 'test',
                  logprob: -0.1,
                },
              ],
              refusal: null,
            },
            finish_reason: null,
            index: 0,
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk' as const,
      };

      expect(() => ChatCompletionChunk.parse(chunk)).not.toThrow();
    });

    it('should reject invalid object type for chunk', () => {
      const invalidChunk = {
        id: 'chatcmpl-123',
        choices: [],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion', // should be 'chat.completion.chunk'
      };

      expect(() => ChatCompletionChunk.parse(invalidChunk)).toThrow();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple choices in response', () => {
      const response = {
        id: 'chatcmpl-123',
        choices: [
          {
            finish_reason: ChatCompletionFinishReason.STOP,
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'First choice',
            },
          },
          {
            finish_reason: ChatCompletionFinishReason.STOP,
            index: 1,
            message: {
              role: 'assistant' as const,
              content: 'Second choice',
            },
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
      };

      expect(() => ChatCompletionResponseBody.parse(response)).not.toThrow();
      const parsed = ChatCompletionResponseBody.parse(response);
      expect(parsed.choices).toHaveLength(2);
    });

    it('should handle complex tool call in message', () => {
      const response = {
        id: 'chatcmpl-123',
        choices: [
          {
            finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
            index: 0,
            message: {
              role: 'assistant' as const,
              content: null,
              tool_calls: [
                {
                  id: 'call_abc123',
                  type: 'function' as const,
                  function: {
                    name: 'get_current_weather',
                    arguments:
                      '{"location": "Boston, MA", "unit": "fahrenheit"}',
                  },
                },
              ],
            },
          },
        ],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
      };

      expect(() => ChatCompletionResponseBody.parse(response)).not.toThrow();
    });

    it('should handle empty choices array', () => {
      const response = {
        id: 'chatcmpl-123',
        choices: [],
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion' as const,
      };

      expect(() => ChatCompletionResponseBody.parse(response)).not.toThrow();
    });
  });
});
