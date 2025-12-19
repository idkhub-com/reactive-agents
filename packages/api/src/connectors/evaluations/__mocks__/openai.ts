import { vi } from 'vitest';

// Mock OpenAI client for evaluation tests
export const mockParse = vi.fn();
export const mockWithOptions = vi.fn().mockReturnValue({
  chat: {
    completions: {
      parse: mockParse,
    },
  },
});

// Setup the OpenAI mock
export function setupOpenAIMock() {
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
}

// Helper to mock a successful evaluation response
export function mockSuccessfulEvaluation(score: number, reasoning: string) {
  mockParse.mockResolvedValueOnce({
    choices: [
      {
        message: {
          parsed: {
            score,
            reasoning,
          },
        },
      },
    ],
  });
}

// Helper to reset all mocks
export function resetOpenAIMocks() {
  mockParse.mockReset();
  mockWithOptions.mockClear();
}
