import {
  createRoleAdherenceEvaluator,
  evaluateRoleAdherence,
} from '@server/connectors/evaluations/role-adherence/service/role-adherence-criteria';
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

describe('Role Adherence Evaluator', () => {
  let evaluator: ReturnType<typeof createRoleAdherenceEvaluator>;

  beforeEach(() => {
    evaluator = createRoleAdherenceEvaluator();
    mockFetch.mockClear();
  });

  it('should create a role adherence evaluator instance', () => {
    expect(evaluator).toBeDefined();
    expect(typeof evaluator.evaluateRoleAdherence).toBe('function');
  });

  it('should evaluate role adherence successfully', async () => {
    const mockEvaluationResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.9,
                reasoning: 'Output aligns closely with role requirements',
                metadata: { metric: 'role_adherence' },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvaluationResponse),
    });

    const result = await evaluator.evaluateRoleAdherence({
      role_definition:
        'You are a concise financial analyst. Avoid personal opinions.',
      assistant_output:
        'Based on Q2 reports, revenue increased 12%. Risks include FX volatility.',
      criteria: {
        strict_mode: false,
        verbose_mode: true,
        include_reason: true,
      },
    });

    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe(
      'Output aligns closely with role requirements',
    );

    // Verify template was used
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({
        body: expect.stringContaining(
          'expert evaluator assessing whether an AI assistant',
        ),
      }),
    );
  });

  it('should parse JSON reasoning when provided', async () => {
    const mockEvaluationResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.85,
                reasoning: JSON.stringify({
                  criteria: {
                    adhered_to_role: true,
                    adherence_level: 0.85,
                    violations: [],
                  },
                  score: 0.85,
                  overall_success: true,
                }),
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvaluationResponse),
    });

    const result = await evaluator.evaluateRoleAdherence({
      role_definition:
        'You are a helpful travel planner. Avoid medical advice.',
      assistant_output:
        'Consider visiting Kyoto in spring; visa depends on nationality.',
    });

    expect(result.score).toBe(0.85);
    expect(result.metadata?.parsed_with_schema).toBe(true);
  });

  it('should work with the standalone evaluateRoleAdherence function', async () => {
    const mockEvaluationResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.8,
                reasoning: 'Good adherence with minor tone deviation',
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvaluationResponse),
    });

    const result = await evaluateRoleAdherence({
      role_definition: 'You are a cybersecurity advisor. Never reveal secrets.',
      assistant_output:
        'Use MFA and strong passwords. Avoid sharing confidential keys.',
    });

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('Good adherence with minor tone deviation');
  });

  it('should handle evaluation errors gracefully with fallback', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await evaluateRoleAdherence({
      role_definition: 'You are a math tutor. Provide step-by-step reasoning.',
      assistant_output: 'Answer: 42',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toContain('Evaluation failed');
    expect(result.metadata?.fallback).toBe(true);
  });
});
