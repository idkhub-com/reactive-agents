#!/usr/bin/env tsx

/**
 * Basic smoke tests for multi-agent workflow example
 * Tests core validation functions without complex API mocking
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variable
process.env.OPENAI_API_KEY = 'test-key-sk-1234567890abcdef1234567890abcdef';

describe('Multi-Agent Workflow - Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('Input Validation', () => {
    it('should validate user input correctly', async () => {
      const { validateUserInput } = await import('./multi-agent-workflow');

      expect(() => validateUserInput('valid input')).not.toThrow();
      expect(() => validateUserInput('')).toThrow(
        'Invalid input: must be a non-empty string',
      );
      expect(() => validateUserInput('  ')).toThrow(
        'Invalid input: cannot be empty after sanitization',
      );
      expect(() => validateUserInput('a'.repeat(10001))).toThrow(
        'Invalid input: exceeds maximum length',
      );
    });

    it('should sanitize input by removing dangerous characters', async () => {
      const { validateUserInput } = await import('./multi-agent-workflow');

      const sanitized = validateUserInput(
        'Hello <script>alert("test")</script> world',
      );
      expect(sanitized).toBe('Hello scriptalert("test")/script world');
    });
  });

  describe('API Key Validation', () => {
    it('should validate API keys with different formats', async () => {
      const { validateApiKey } = await import('./multi-agent-workflow');

      expect(() =>
        validateApiKey('sk-1234567890abcdef1234567890abcdef'),
      ).not.toThrow();
      expect(() =>
        validateApiKey('gsk_1234567890abcdef1234567890abcdef'),
      ).not.toThrow();
      expect(() =>
        validateApiKey('test::1234567890abcdef1234567890abcdef'),
      ).not.toThrow();
      expect(() => validateApiKey('')).toThrow('API key is required');
      expect(() => validateApiKey(undefined)).toThrow('API key is required');
    });

    it('should warn about short API keys', async () => {
      const { validateApiKey } = await import('./multi-agent-workflow');
      const consoleSpy = vi.spyOn(console, 'warn');

      validateApiKey('short');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: API key seems unusually short, please verify it is correct',
      );
    });

    it('should detect different API key formats', async () => {
      const { validateApiKey } = await import('./multi-agent-workflow');
      const consoleSpy = vi.spyOn(console, 'log');

      validateApiKey('sk-1234567890abcdef1234567890abcdef');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Detected OpenAI-style API key format',
      );

      consoleSpy.mockClear();
      validateApiKey('gsk_1234567890abcdef1234567890abcdef');
      expect(consoleSpy).toHaveBeenCalledWith('Detected Groq API key format');

      consoleSpy.mockClear();
      validateApiKey('test::1234567890abcdef1234567890abcdef');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Detected Anthropic API key format',
      );
    });
  });

  describe('Type Guards', () => {
    it('should validate chat completion responses correctly', async () => {
      const { isValidChatCompletionResponse } = await import(
        './multi-agent-workflow'
      );

      const validResponse = {
        object: 'chat.completion',
        id: 'test-id',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Test response',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const invalidResponse = {
        object: 'invalid',
        choices: [],
      };

      expect(isValidChatCompletionResponse(validResponse)).toBe(true);
      expect(isValidChatCompletionResponse(invalidResponse)).toBe(false);
      expect(isValidChatCompletionResponse(null)).toBe(false);
      expect(isValidChatCompletionResponse(undefined)).toBe(false);
      expect(isValidChatCompletionResponse({})).toBe(false);
    });

    it('should validate required fields in chat completion response', async () => {
      const { isValidChatCompletionResponse } = await import(
        './multi-agent-workflow'
      );

      // Missing choices
      expect(
        isValidChatCompletionResponse({
          object: 'chat.completion',
          id: 'test-id',
        }),
      ).toBe(false);

      // Empty choices array
      expect(
        isValidChatCompletionResponse({
          object: 'chat.completion',
          id: 'test-id',
          choices: [],
        }),
      ).toBe(false);

      // Invalid choice structure
      expect(
        isValidChatCompletionResponse({
          object: 'chat.completion',
          id: 'test-id',
          choices: [{ invalid: 'choice' }],
        }),
      ).toBe(false);
    });
  });

  describe('Environment Setup', () => {
    it('should detect environment variable correctly', () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_API_KEY).toContain('sk-');
    });
  });
});
