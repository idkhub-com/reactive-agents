import {
  applyMessageWindow,
  formatMessagesForExtraction,
} from '@server/utils/messages';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { describe, expect, it } from 'vitest';

describe('Messages Utils', () => {
  describe('applyMessageWindow', () => {
    it('should return all messages when window size is 0 or negative', () => {
      const messages = [
        { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi there' },
        { role: ChatCompletionMessageRole.USER, content: 'How are you?' },
      ];

      expect(applyMessageWindow(messages, 0)).toEqual(messages);
      expect(applyMessageWindow(messages, -1)).toEqual(messages);
    });

    it('should return all messages when conversation is shorter than window size', () => {
      const messages = [
        {
          role: ChatCompletionMessageRole.SYSTEM,
          content: 'You are a helpful assistant',
        },
        { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi there' },
      ];

      const result = applyMessageWindow(messages, 10);
      expect(result).toEqual(messages);
    });

    it('should preserve system messages and apply window to conversation messages', () => {
      const messages = [
        {
          role: ChatCompletionMessageRole.SYSTEM,
          content: 'You are a helpful assistant',
        },
        {
          role: ChatCompletionMessageRole.DEVELOPER,
          content: 'Debug mode enabled',
        },
        { role: ChatCompletionMessageRole.USER, content: 'Message 1' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Response 1' },
        { role: ChatCompletionMessageRole.USER, content: 'Message 2' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Response 2' },
        { role: ChatCompletionMessageRole.USER, content: 'Message 3' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Response 3' },
      ];

      const result = applyMessageWindow(messages, 2);

      expect(result).toEqual([
        {
          role: ChatCompletionMessageRole.SYSTEM,
          content: 'You are a helpful assistant',
        },
        {
          role: ChatCompletionMessageRole.DEVELOPER,
          content: 'Debug mode enabled',
        },
        { role: ChatCompletionMessageRole.USER, content: 'Message 2' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Response 2' },
        { role: ChatCompletionMessageRole.USER, content: 'Message 3' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Response 3' },
      ]);
    });

    it('should handle window size larger than conversation messages', () => {
      const messages = [
        { role: ChatCompletionMessageRole.SYSTEM, content: 'System prompt' },
        { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi' },
      ];

      const result = applyMessageWindow(messages, 5);
      expect(result).toEqual(messages);
    });

    it('should handle only system messages', () => {
      const messages = [
        { role: ChatCompletionMessageRole.SYSTEM, content: 'System prompt' },
        { role: ChatCompletionMessageRole.DEVELOPER, content: 'Debug info' },
      ];

      const result = applyMessageWindow(messages, 2);
      expect(result).toEqual(messages);
    });

    it('should handle empty messages array', () => {
      const messages: Array<{
        role: ChatCompletionMessageRole;
        content: string;
      }> = [];
      const result = applyMessageWindow(messages, 5);
      expect(result).toEqual([]);
    });

    it('should apply window to conversation messages only', () => {
      const messages = [
        { role: ChatCompletionMessageRole.SYSTEM, content: 'System' },
        { role: ChatCompletionMessageRole.USER, content: 'User 1' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 1' },
        { role: ChatCompletionMessageRole.USER, content: 'User 2' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 2' },
        { role: ChatCompletionMessageRole.USER, content: 'User 3' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 3' },
        { role: ChatCompletionMessageRole.USER, content: 'User 4' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 4' },
      ];

      const result = applyMessageWindow(messages, 3);

      expect(result).toEqual([
        { role: ChatCompletionMessageRole.SYSTEM, content: 'System' },
        { role: ChatCompletionMessageRole.USER, content: 'User 2' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 2' },
        { role: ChatCompletionMessageRole.USER, content: 'User 3' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 3' },
        { role: ChatCompletionMessageRole.USER, content: 'User 4' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Assistant 4' },
      ]);
    });
  });

  describe('formatMessagesForExtraction', () => {
    it('should format messages correctly', () => {
      const messages = [
        { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi there' },
      ];

      const result = formatMessagesForExtraction(messages);
      expect(result).toBe('User: Hello\n\n\nAssistant: Hi there');
    });

    it('should exclude system and developer messages', () => {
      const messages = [
        { role: ChatCompletionMessageRole.SYSTEM, content: 'System prompt' },
        { role: ChatCompletionMessageRole.DEVELOPER, content: 'Debug info' },
        { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        { role: ChatCompletionMessageRole.ASSISTANT, content: 'Hi there' },
      ];

      const result = formatMessagesForExtraction(messages);
      expect(result).toBe('User: Hello\n\n\nAssistant: Hi there');
    });
  });
});
