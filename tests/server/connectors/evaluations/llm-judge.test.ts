import { createLLMJudge } from '@server/evaluations/llm-judge';
import { AIProvider } from '@shared/types/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock OpenAI client
const mockParse = vi.fn();
const mockWithOptions = vi.fn().mockReturnValue({
  chat: {
    completions: {
      parse: mockParse,
    },
  },
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          parse: mockParse,
        },
      },
      withOptions: mockWithOptions,
    })),
  };
});

// Mock the constants
vi.mock('@server/constants', () => ({
  API_URL: 'http://localhost:3000',
  BEARER_TOKEN: 'reactive-agents',
}));

// Model config with API key for tests
const mockModelConfig = {
  model: 'gpt-5-mini',
  provider: AIProvider.OPENAI,
  apiKey: 'test-api-key',
};

describe('LLM Judge', () => {
  let llmJudge: ReturnType<typeof createLLMJudge>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    llmJudge = createLLMJudge({}, mockModelConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create LLM judge with default config', () => {
    expect(llmJudge.config.model).toBe('gpt-5-mini');
    expect(llmJudge.config.temperature).toBe(0.1);
    expect(llmJudge.config.max_tokens).toBe(1000);
    expect(llmJudge.config.timeout).toBe(30000);
  });

  it('should create LLM judge with custom config', () => {
    const customJudge = createLLMJudge({
      model: 'gpt-4',
      temperature: 0.5,
      max_tokens: 2000,
      timeout: 60000,
    });

    expect(customJudge.config.model).toBe('gpt-4');
    expect(customJudge.config.temperature).toBe(0.5);
    expect(customJudge.config.max_tokens).toBe(2000);
    expect(customJudge.config.timeout).toBe(60000);
  });

  it('should evaluate text successfully', async () => {
    const mockParsedResponse = {
      score: 0.8,
      reasoning: 'This is a good evaluation',
    };

    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: mockParsedResponse,
          },
        },
      ],
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('This is a good evaluation');

    // Verify the OpenAI client was called correctly
    expect(mockWithOptions).toHaveBeenCalledWith({
      defaultHeaders: {
        'ra-config': expect.stringContaining('"provider":"openai"'),
      },
    });
    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
      }),
    );
  });

  it('should return fallback result when API key is not configured', async () => {
    // Mock the constants to return empty API key
    vi.doMock('@server/constants', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@server/constants')>();
      return {
        ...actual,
      };
    });

    // Clear module cache and re-import with empty API key
    vi.resetModules();
    const { createLLMJudge: createLLMJudgeWithNoKey } = await import(
      '@server/evaluations/llm-judge'
    );
    const judgeWithNoKey = createLLMJudgeWithNoKey();

    const result = await judgeWithNoKey.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe(
      'Evaluation skipped - OpenAI API key not configured',
    );
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'no_api_key',
    });
  });

  it('should handle API errors gracefully', async () => {
    mockParse.mockRejectedValue(
      new Error('OpenAI API error: 500 Internal Server Error - API Error'),
    );

    const evaluatePromise = llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    // Fast-forward through retry delays (1s + 2s = 3s total)
    await vi.advanceTimersByTimeAsync(3000);

    const result = await evaluatePromise;

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe(
      'Evaluation failed - OpenAI API error (retried 2/3 times)',
    );
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'api_error',
      errorDetails: 'OpenAI API error: 500 Internal Server Error - API Error',
      retryInfo: {
        retryCount: 2,
        maxRetries: 3,
      },
    });
  });

  it('should handle invalid response structure', async () => {
    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: null, // Invalid: null parsed response
          },
        },
      ],
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe('Evaluation failed - response parsing error');
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'parse_error',
      errorDetails: 'No parsed response from AI provider',
    });
  });

  it('should handle missing output in response', async () => {
    mockParse.mockResolvedValueOnce({
      choices: [],
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe('Evaluation failed - OpenAI API error');
    expect(result.metadata?.fallback).toBe(true);
    expect(result.metadata?.errorType).toBe('api_error');
  });

  it('should evaluate code text successfully', async () => {
    const mockParsedResponse = {
      score: 0.9,
      reasoning: 'Excellent code quality with proper syntax',
    };

    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: mockParsedResponse,
          },
        },
      ],
    });

    const result = await llmJudge.evaluate({
      text: 'function add(a, b) { return a + b; }',
      evaluationCriteria: {
        criteria: ['Code correctness', 'Readability', 'Best practices'],
        description: 'Code quality evaluation',
      },
    });

    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe('Excellent code quality with proper syntax');
  });

  it('should use custom evaluation criteria when provided', async () => {
    const mockParsedResponse = {
      score: 0.9,
      reasoning: 'Excellent with custom criteria',
    };

    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: mockParsedResponse,
          },
        },
      ],
    });

    const customCriteria = {
      criteria: [
        'Custom criterion 1',
        'Custom criterion 2',
        'Custom criterion 3',
      ],
      description: 'Custom evaluation criteria',
    };

    const result = await llmJudge.evaluate({
      text: 'This is a test text for evaluation.',
      evaluationCriteria: customCriteria,
    });

    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe('Excellent with custom criteria');

    // Verify custom criteria was used in the system prompt
    const callArgs = mockParse.mock.calls[0][0];
    const systemMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === 'system',
    );
    expect(systemMessage.content).toContain('Custom criterion 1');
  });

  it('should fall back to default criteria when no custom criteria provided', async () => {
    const mockParsedResponse = {
      score: 0.7,
      reasoning: 'Good with default criteria',
    };

    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: mockParsedResponse,
          },
        },
      ],
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test text for evaluation.',
    });

    expect(result.score).toBe(0.7);
    expect(result.reasoning).toBe('Good with default criteria');

    // Verify OpenAI client was called
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  it('should retry failed requests up to three times with exponential backoff', async () => {
    const mockParsedResponse = {
      score: 0.8,
      reasoning: 'Success after retries',
    };

    // Mock to fail twice with network errors, then succeed
    mockParse
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: mockParsedResponse,
            },
          },
        ],
      });

    const evaluatePromise = llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    // Fast-forward through the retry delays (1s + 2s = 3s total)
    await vi.advanceTimersByTimeAsync(3000);

    const result = await evaluatePromise;

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('Success after retries');

    // Verify was called 3 times (2 failures + 1 success)
    expect(mockParse).toHaveBeenCalledTimes(3);
  });

  it('should return fallback result after all retries are exhausted', async () => {
    // Mock to fail with retryable errors all 3 times
    mockParse
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockRejectedValueOnce(new Error('Service temporarily unavailable'));

    const evaluatePromise = llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    // Fast-forward through all retry delays (1s + 2s = 3s total)
    await vi.advanceTimersByTimeAsync(3000);

    const result = await evaluatePromise;

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe(
      'Evaluation failed - OpenAI API error (retried 2/3 times)',
    );
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'api_error',
      errorDetails: 'Service temporarily unavailable',
      retryInfo: {
        retryCount: 2,
        maxRetries: 3,
      },
    });

    // Verify was called 3 times
    expect(mockParse).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    // Mock to fail with a non-retryable error (parse error)
    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: null,
          },
        },
      ],
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe('Evaluation failed - response parsing error');
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'parse_error',
      errorDetails: 'No parsed response from AI provider',
    });

    // Verify was called only once (no retries for parse errors)
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  // Additional comprehensive retry logic tests
  describe('Retry Logic Edge Cases', () => {
    it('should handle mixed retryable and non-retryable errors correctly', async () => {
      // First call: retryable error (network)
      // Second call: non-retryable error (parse error)
      mockParse
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                parsed: null,
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the first retry delay (1s)
      await vi.advanceTimersByTimeAsync(1000);

      const result = await evaluatePromise;

      expect(result.score).toBe(0.5);
      expect(result.reasoning).toBe(
        'Evaluation failed - response parsing error (retried 1/3 times)',
      );
      expect(result.metadata).toEqual({
        fallback: true,
        errorType: 'parse_error',
        errorDetails: 'No parsed response from AI provider',
        retryInfo: {
          retryCount: 1,
          maxRetries: 3,
        },
      });

      // Should retry once for network error, then fail on parse error
      expect(mockParse).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout errors as retryable', async () => {
      const mockParsedResponse = {
        score: 0.8,
        reasoning: 'Success after retries',
      };

      mockParse
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                parsed: mockParsedResponse,
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(3000);

      const result = await evaluatePromise;

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');

      // Should retry twice, then succeed
      expect(mockParse).toHaveBeenCalledTimes(3);
    });

    it('should handle rate limit errors as retryable', async () => {
      const mockParsedResponse = {
        score: 0.8,
        reasoning: 'Success after retries',
      };

      mockParse
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Too many requests'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                parsed: mockParsedResponse,
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(3000);

      const result = await evaluatePromise;

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');

      // Should retry twice, then succeed
      expect(mockParse).toHaveBeenCalledTimes(3);
    });

    it('should handle server errors (5xx) as retryable', async () => {
      const mockParsedResponse = {
        score: 0.8,
        reasoning: 'Success after retries',
      };

      mockParse
        .mockRejectedValueOnce(new Error('Internal server error'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                parsed: mockParsedResponse,
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(3000);

      const result = await evaluatePromise;

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');

      // Should retry twice, then succeed
      expect(mockParse).toHaveBeenCalledTimes(3);
    });

    it('should not retry client errors (4xx)', async () => {
      mockParse.mockRejectedValueOnce(new Error('Bad request'));

      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      expect(result.score).toBe(0.5);
      expect(result.reasoning).toBe('Evaluation failed - OpenAI API error');
      expect(result.metadata).toEqual({
        fallback: true,
        errorType: 'api_error',
        errorDetails: 'Bad request',
      });

      // Should not retry client errors
      expect(mockParse).toHaveBeenCalledTimes(1);
    });

    it('should handle exponential backoff timing correctly', async () => {
      // Mock to fail all 3 times
      mockParse
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through all retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(3000);

      await evaluatePromise;

      // Should make 3 calls (initial + 2 retries)
      expect(mockParse).toHaveBeenCalledTimes(3);
    });

    it('should handle successful first attempt (no retries needed)', async () => {
      const mockParsedResponse = {
        score: 0.8,
        reasoning: 'Success after retries',
      };

      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: mockParsedResponse,
            },
          },
        ],
      });

      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');

      // Should succeed on first attempt, no retries
      expect(mockParse).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown errors as non-retryable', async () => {
      mockParse.mockRejectedValueOnce(new Error('Unknown error type'));

      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      expect(result.score).toBe(0.5);
      expect(result.reasoning).toBe(
        'Evaluation failed - unknown error occurred',
      );
      expect(result.metadata).toEqual({
        fallback: true,
        errorType: 'unknown_error',
        errorDetails: 'Unknown error type',
      });

      // Should not retry unknown errors
      expect(mockParse).toHaveBeenCalledTimes(1);
    });

    it('should handle throwing non-Error objects', async () => {
      mockParse.mockRejectedValueOnce('String error');

      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      expect(result.score).toBe(0.5);
      expect(result.reasoning).toBe(
        'Evaluation failed - unknown error occurred',
      );
      expect(result.metadata).toEqual({
        fallback: true,
        errorType: 'unknown_error',
        errorDetails: 'String error',
      });

      // Should not retry non-Error objects
      expect(mockParse).toHaveBeenCalledTimes(1);
    });

    it('should handle throwing null/undefined', async () => {
      mockParse.mockRejectedValueOnce(null);

      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      expect(result.score).toBe(0.5);
      expect(result.reasoning).toBe(
        'Evaluation failed - unknown error occurred',
      );
      expect(result.metadata).toEqual({
        fallback: true,
        errorType: 'unknown_error',
        errorDetails: 'null',
      });

      // Should not retry null/undefined
      expect(mockParse).toHaveBeenCalledTimes(1);
    });
  });
});
