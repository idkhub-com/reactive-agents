import { createLLMJudge } from '@server/evaluations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the constants
vi.mock('@server/constants', () => ({
  OPENAI_API_KEY: 'test-api-key',
  API_URL: 'http://localhost:3000',
  BEARER_TOKEN: 'idk',
}));

describe('LLM Judge', () => {
  let llmJudge: ReturnType<typeof createLLMJudge>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    llmJudge = createLLMJudge();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should create LLM judge with default config', () => {
    expect(llmJudge.config.model).toBe('gpt-4o-mini');
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
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.8,
                reasoning: 'This is a good evaluation',
                metadata: { test: true },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('This is a good evaluation');
    expect(result.metadata).toEqual({ test: true });

    // Verify the API call
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer idk',
          'x-idk-config': expect.stringContaining('"provider":"openai"'),
        }),
        body: expect.stringContaining('"model":"gpt-4o-mini"'),
      }),
    );
  });

  it('should return fallback result when API key is not configured', async () => {
    // Mock the constants to return empty API key
    vi.doMock('@server/constants', () => ({
      OPENAI_API_KEY: '',
    }));

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
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('API Error'),
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe(
      'Evaluation failed - OpenAI API error (retried 1/3 times)',
    );
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'api_error',
      errorDetails: "Cannot read properties of undefined (reading 'ok')",
      retryInfo: {
        retryCount: 1,
        maxRetries: 3,
      },
    });
  });

  it('should handle invalid response structure', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'invalid json',
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe('Evaluation failed - response parsing error');
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'parse_error',
      errorDetails: expect.stringContaining('Unexpected token'),
    });
  });

  it('should handle missing output in response', async () => {
    const mockResponse = {};

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe('Evaluation failed - response parsing error');
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'parse_error',
      errorDetails: expect.stringContaining('No valid message output'),
    });
  });

  it('should evaluate code text successfully', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.9,
                reasoning: 'Excellent code quality with proper syntax',
                metadata: { contentType: 'code' },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
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
    expect(result.metadata).toEqual({ contentType: 'code' });
  });

  it('should use custom evaluation criteria when provided', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.9,
                reasoning: 'Excellent with custom criteria',
                metadata: { customCriteria: true },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
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
    expect(result.metadata).toEqual({ customCriteria: true });

    // Verify custom criteria was used in the API call
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({
        body: expect.stringContaining('Custom criterion 1'),
      }),
    );
  });

  it('should fall back to default criteria when no custom criteria provided', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.7,
                reasoning: 'Good with default criteria',
                metadata: { defaultCriteria: true },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test text for evaluation.',
    });

    expect(result.score).toBe(0.7);
    expect(result.reasoning).toBe('Good with default criteria');
    expect(result.metadata).toEqual({ defaultCriteria: true });

    // Verify text evaluation was called
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer idk',
          'x-idk-config': expect.stringContaining('"provider":"openai"'),
        }),
      }),
    );
  });

  it('should retry failed requests up to three times with exponential backoff', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.8,
                reasoning: 'Success after retries',
                metadata: { retried: true },
              }),
            },
          ],
        },
      ],
    };

    // Mock fetch to fail twice with network errors, then succeed
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

    const startTime = Date.now();
    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });
    const endTime = Date.now();

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('Success after retries');
    expect(result.metadata).toEqual({ retried: true });

    // Verify fetch was called 3 times (2 failures + 1 success)
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Verify exponential backoff timing (should take at least 3 seconds: 1s + 2s)
    expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
  });

  it('should return fallback result after all retries are exhausted', async () => {
    // Mock fetch to fail with retryable errors all 3 times
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockRejectedValueOnce(new Error('Service temporarily unavailable'));

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

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

    // Verify fetch was called 3 times
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    // Mock fetch to fail with a non-retryable error (parse error)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: 'invalid json',
                },
              ],
            },
          ],
        }),
    });

    const result = await llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toBe('Evaluation failed - response parsing error');
    expect(result.metadata).toEqual({
      fallback: true,
      errorType: 'parse_error',
      errorDetails: expect.stringContaining('Unexpected token'),
    });

    // Verify fetch was called only once (no retries for parse errors)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // Additional comprehensive retry logic tests
  describe('Retry Logic Edge Cases', () => {
    it('should handle mixed retryable and non-retryable errors correctly', async () => {
      // First call: retryable error (network)
      // Second call: non-retryable error (parse error)
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              output: [
                {
                  type: 'message',
                  content: [
                    {
                      type: 'output_text',
                      text: 'invalid json',
                    },
                  ],
                },
              ],
            }),
        });

      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      expect(result.score).toBe(0.5);
      expect(result.reasoning).toBe(
        'Evaluation failed - response parsing error (retried 1/3 times)',
      );
      expect(result.metadata).toEqual({
        fallback: true,
        errorType: 'parse_error',
        errorDetails: expect.stringContaining('Unexpected token'),
        retryInfo: {
          retryCount: 1,
          maxRetries: 3,
        },
      });

      // Should retry once for network error, then fail on parse error
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout errors as retryable', async () => {
      const mockResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.8,
                  reasoning: 'Success after retries',
                  metadata: { retried: true },
                }),
              },
            ],
          },
        ],
      };

      mockFetch
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const startTime = Date.now();
      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });
      const endTime = Date.now();

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');
      expect(result.metadata).toEqual({ retried: true });

      // Should retry twice, then succeed
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    });

    it('should handle rate limit errors as retryable', async () => {
      const mockResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.8,
                  reasoning: 'Success after retries',
                  metadata: { retried: true },
                }),
              },
            ],
          },
        ],
      };

      mockFetch
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Too many requests'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const startTime = Date.now();
      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });
      const endTime = Date.now();

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');
      expect(result.metadata).toEqual({ retried: true });

      // Should retry twice, then succeed
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    });

    it('should handle server errors (5xx) as retryable', async () => {
      const mockResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.8,
                  reasoning: 'Success after retries',
                  metadata: { retried: true },
                }),
              },
            ],
          },
        ],
      };

      mockFetch
        .mockRejectedValueOnce(new Error('Internal server error'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const startTime = Date.now();
      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });
      const endTime = Date.now();

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');
      expect(result.metadata).toEqual({ retried: true });

      // Should retry twice, then succeed
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    });

    it('should not retry client errors (4xx)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Bad request'));

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle exponential backoff timing correctly', async () => {
      // Mock fetch to fail all 3 times
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const startTime = Date.now();
      await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });
      const endTime = Date.now();

      // Should take at least 3 seconds: 1s + 2s + 4s = 7s total delay
      // But we only wait for 2 delays (between 3 calls), so minimum 3s
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle successful first attempt (no retries needed)', async () => {
      const mockResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.8,
                  reasoning: 'Success after retries',
                  metadata: { retried: true },
                }),
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const startTime = Date.now();
      const result = await llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });
      const endTime = Date.now();

      expect(result.score).toBe(0.8);
      expect(result.reasoning).toBe('Success after retries');
      expect(result.metadata).toEqual({ retried: true });

      // Should succeed on first attempt, no delays
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    it('should handle unknown errors as non-retryable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unknown error type'));

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch throwing non-Error objects', async () => {
      mockFetch.mockRejectedValueOnce('String error');

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch throwing null/undefined', async () => {
      mockFetch.mockRejectedValueOnce(null);

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
