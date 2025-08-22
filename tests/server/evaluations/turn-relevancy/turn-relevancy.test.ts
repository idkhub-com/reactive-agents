import {
  createTurnRelevancyEvaluator,
  evaluateTurnRelevancy,
} from '@server/connectors/evaluations/turn-relevancy/service/turn-relevancy-criteria';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the constants
vi.mock('@server/constants', () => ({
  OPENAI_API_KEY: 'test-api-key',
  API_URL: 'http://localhost:3000',
  BEARER_TOKEN: 'idk',
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Turn Relevancy Evaluator', () => {
  let evaluator: ReturnType<typeof createTurnRelevancyEvaluator>;

  beforeEach(() => {
    evaluator = createTurnRelevancyEvaluator();
    mockFetch.mockClear();
  });

  it('creates evaluator instance', () => {
    expect(evaluator).toBeDefined();
    expect(typeof evaluator.evaluateTurnRelevancy).toBe('function');
  });

  it('evaluates turn relevancy successfully', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.9,
                reasoning: 'Turn is relevant to prior context',
                metadata: {
                  relevant: true,
                  relevance_reasons: ['mentions earlier topic'],
                },
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

    const result = await evaluator.evaluateTurnRelevancy({
      conversation_history: 'User asked about weather in Paris.',
      current_turn: 'Tomorrow will be sunny in Paris with 22°C.',
    });

    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe('Turn is relevant to prior context');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('parses JSON reasoning when provided', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.85,
                reasoning: JSON.stringify({
                  score: 0.85,
                  reasoning: 'Structured turn relevancy result',
                  metadata: {
                    relevant: true,
                    relevance_reasons: ['topic continuity'],
                  },
                }),
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

    const result = await evaluateTurnRelevancy({
      conversation_history: 'Let’s discuss project timeline.',
      current_turn: 'The next milestone is scheduled for Friday.',
    });

    expect(result.score).toBe(0.85);
    expect(result.metadata?.parsed_with_schema).toBe(true);
  });

  it('handles errors with fallback', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await evaluateTurnRelevancy({
      conversation_history: 'A',
      current_turn: 'B',
    });
    expect(result.score).toBe(0.5);
    expect(result.reasoning).toContain('Evaluation failed');
    expect(result.metadata?.fallback).toBe(true);
  });
});
