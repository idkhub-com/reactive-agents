import { extractTaskAndOutcome } from '@api/connectors/evaluations/task-completion/service/task-and-outcome';
import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The extraction call reaches the judge model over the raw OpenAI client,
 * and a self-hosted judge ignores `response_format` often enough that its
 * answer arrives with a trailing comma or prose around the object. The
 * SDK's strict `.parse()` failed the whole task-completion evaluation on
 * that; the reply is now parsed tolerantly, like the judge's own answers.
 */

vi.mock('@api/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/constants')>();
  return {
    ...actual,
    getApiUrl: () => 'http://localhost:8787',
  };
});

const mockCreate = vi.fn();
const mockWithOptions = vi.fn().mockReturnValue({
  chat: { completions: { create: mockCreate, parse: mockCreate } },
});

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate, parse: mockCreate } },
    withOptions: mockWithOptions,
  })),
}));

vi.mock('@api/utils/evaluation-model-resolver', () => ({
  resolveSystemSettingsModel: vi.fn().mockResolvedValue({
    model: 'judge-model',
    provider: 'ollama',
    customHost: 'http://localhost:11434/v1',
  }),
}));

const judgeAnswers = (content: string) => {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content } }],
  });
};

const run = () =>
  extractTaskAndOutcome(
    createMockContext(),
    {
      task: '',
      threshold: 0.5,
      include_reason: true,
      strict_mode: false,
      async_mode: false,
      verbose_mode: false,
      temperature: 0.1,
      max_tokens: 1000,
      batch_size: 1,
    },
    'User: review the code changes',
    'Code changes review',
    {} as UserDataStorageConnector,
  );

describe('extractTaskAndOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts from clean JSON', async () => {
    judgeAnswers(
      JSON.stringify({ task: 'produce a title', outcome: 'a title' }),
    );

    await expect(run()).resolves.toEqual({
      task: 'produce a title',
      outcome: 'a title',
    });
  });

  it('tolerates a trailing comma and prose around the object', async () => {
    judgeAnswers(
      'Here is the extraction:\n{"task": "produce a title", "outcome": "a title",}\nHope that helps!',
    );

    await expect(run()).resolves.toEqual({
      task: 'produce a title',
      outcome: 'a title',
    });
  });

  it('rejects an answer missing the outcome', async () => {
    judgeAnswers(JSON.stringify({ task: 'produce a title' }));

    await expect(run()).rejects.toThrow(
      'the response does not match the schema',
    );
  });
});
