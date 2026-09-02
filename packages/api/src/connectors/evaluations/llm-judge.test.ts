import { createLLMJudge } from '@api/evaluations/llm-judge';
import { createMockContext } from '@api/test-utils/mock-context';
import { AIProvider } from '@shared/types/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockContext = createMockContext();

// Mock OpenAI client
const mockParse = vi.fn();
const mockWithOptions = vi.fn().mockReturnValue({
  chat: {
    completions: {
      parse: mockParse,
      create: mockParse,
    },
  },
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          parse: mockParse,
          create: mockParse,
        },
      },
      withOptions: mockWithOptions,
    })),
  };
});

// Mock the constants
vi.mock('@api/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/constants')>();
  return {
    ...actual,
    getApiUrl: () => 'http://localhost:8787',
    getBearerToken: () => 'super-agents',
  };
});

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
    llmJudge = createLLMJudge(mockContext, {}, mockModelConfig);
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
    const customJudge = createLLMJudge(mockContext, {
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
            content: JSON.stringify(mockParsedResponse),
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
        'sa-config': expect.stringContaining('"provider":"openai"'),
      },
    });
    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        // One-shot prompts: nothing would read a cache written for them.
        prompt_cache_options: { mode: 'explicit' },
      }),
    );
  });

  it('should return fallback result when API key is not configured', async () => {
    // Mock the constants to return empty API key
    vi.doMock('@api/constants', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@api/constants')>();
      return {
        ...actual,
      };
    });

    // Clear module cache and re-import with empty API key
    vi.resetModules();
    const { createLLMJudge: createLLMJudgeWithNoKey } = await import(
      '@api/evaluations/llm-judge'
    );
    const judgeWithNoKey = createLLMJudgeWithNoKey(mockContext);

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

  it('should evaluate against a provider that needs no API key', async () => {
    const ollamaJudge = createLLMJudge(
      mockContext,
      {},
      {
        model: 'qwen3.8b27b',
        provider: AIProvider.OLLAMA,
        customHost: 'http://localhost:11434',
      },
    );

    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ score: 0.9, reasoning: 'Good' }),
          },
        },
      ],
    });

    const result = await ollamaJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    expect(result.score).toBe(0.9);
    expect(result.metadata).toBeUndefined();

    const config = JSON.parse(
      vi.mocked(mockWithOptions).mock.calls[0][0].defaultHeaders['sa-config'],
    );
    expect(config.targets[0]).not.toHaveProperty('api_key');
    expect(config.targets[0].custom_host).toBe('http://localhost:11434');
  });

  it('bypasses the cache when it retries a bad answer', async () => {
    // The judge caches its answers, and a retry sends the identical request:
    // without a forced refresh it would be served the same essay again.
    mockParse
      .mockResolvedValueOnce({
        choices: [
          { message: { content: '# Evaluation\n\nThe answer was fine.' } },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ score: 0.8, reasoning: 'Fine' }),
            },
          },
        ],
      });

    const evaluatePromise = llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await evaluatePromise;

    expect(result.score).toBe(0.8);
    const configs = vi
      .mocked(mockWithOptions)
      .mock.calls.map((call) =>
        JSON.parse(call[0].defaultHeaders['sa-config']),
      );
    expect(configs).toHaveLength(2);
    expect(configs[0].force_refresh).toBeUndefined();
    expect(configs[1].force_refresh).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    mockParse.mockRejectedValue(
      new Error('OpenAI API error: 500 Internal Server Error - API Error'),
    );

    const evaluatePromise = llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    // Fast-forward through retry delays (1s + 2s = 3s total)
    await vi.advanceTimersByTimeAsync(8787);

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
            content: JSON.stringify(null), // Invalid: null parsed response
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

  it('tolerates a trailing comma and prose around the judge JSON', async () => {
    // What a self-hosted judge actually sends: the object is there, but the
    // strict parser used to throw and the evaluation fell back to 0.5.
    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content:
              'Here is my verdict:\n{\n"score": 0.8,\n"reasoning": "solid",\n}',
          },
        },
      ],
    });

    const result = await llmJudge.evaluate({ text: 'judge this' });

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('solid');
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
            content: JSON.stringify(mockParsedResponse),
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
            content: JSON.stringify(mockParsedResponse),
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
            content: JSON.stringify(mockParsedResponse),
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
              content: JSON.stringify(mockParsedResponse),
            },
          },
        ],
      });

    const evaluatePromise = llmJudge.evaluate({
      text: 'This is a test evaluation.',
    });

    // Fast-forward through the retry delays (1s + 2s = 3s total)
    await vi.advanceTimersByTimeAsync(8787);

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
    await vi.advanceTimersByTimeAsync(8787);

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
            content: JSON.stringify(null),
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
                content: JSON.stringify(null),
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
                content: JSON.stringify(mockParsedResponse),
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(8787);

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
                content: JSON.stringify(mockParsedResponse),
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(8787);

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
                content: JSON.stringify(mockParsedResponse),
              },
            },
          ],
        });

      const evaluatePromise = llmJudge.evaluate({
        text: 'This is a test evaluation.',
      });

      // Fast-forward through the retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(8787);

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
      await vi.advanceTimersByTimeAsync(8787);

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
              content: JSON.stringify(mockParsedResponse),
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

  describe('prompt routing', () => {
    const judgeAnswer = (payload: unknown) => {
      mockParse.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      });
    };

    it('uses explicit prompts verbatim and returns the real score', async () => {
      // The template heuristics split on the first blank line and flip to a
      // "structured" result whenever the text mentions a JSON object -- which
      // reported score 1.0 no matter what the judge answered. Explicit
      // prompts must bypass all of it.
      judgeAnswer({ score: 0.3, reasoning: 'barely relevant' });

      const systemPrompt =
        'You are an evaluator.\nReturn your response as a JSON object.';
      const userPrompt = 'Conversation:\nUser: hi\n\nUser: also this';
      const result = await llmJudge.evaluate({
        text: `${systemPrompt}\n\n${userPrompt}`,
        systemPrompt,
        userPrompt,
      });

      expect(result.score).toBe(0.3);
      expect(result.reasoning).toBe('barely relevant');
      expect(mockParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      );
    });

    it('treats a call as an extraction only when declared structured', async () => {
      judgeAnswer({ task: 'summarize', outcome: 'a summary' });

      const result = await llmJudge.evaluate({
        text: '',
        systemPrompt: 'Extract the task and outcome.',
        userPrompt: 'INPUT: hello OUTPUT: world',
        structured: true,
      });

      expect(result.score).toBe(1.0);
      expect(result.metadata).toEqual({
        task: 'summarize',
        outcome: 'a summary',
      });
    });

    it('lets explicit criteria win over the template heuristics', async () => {
      // Conversation content can contain "You are", "evaluate" and blank
      // lines; a caller that provided criteria means the scored criteria
      // judge, never a heuristic re-split of its text.
      judgeAnswer({ score: 0.2, reasoning: 'mostly unmet' });

      const result = await llmJudge.evaluate({
        text: 'You are an expert evaluator, they said.\n\nPlease evaluate my conversation for completeness.',
        evaluationCriteria: { criteria: ['Check every user intention'] },
      });

      expect(result.score).toBe(0.2);
      const call = mockParse.mock.calls[0][0];
      expect(call.messages[0].content).toContain('You are a quality evaluator');
      expect(call.messages[0].content).toContain('Check every user intention');
    });
  });
});
