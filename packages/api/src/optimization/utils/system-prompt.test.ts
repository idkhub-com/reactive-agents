import { generateSeedSystemPromptWithContext } from '@api/optimization/utils/system-prompt';
import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockParse = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    withOptions: () => ({ chat: { completions: { parse: mockParse } } }),
  })),
}));

vi.mock('@api/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@api/constants')>()),
  getApiUrl: () => 'http://localhost:8787',
}));

vi.mock('@api/utils/evaluation-model-resolver', () => ({
  resolveSystemSettingsModel: vi.fn(async () => ({
    model: 'gpt-5-mini',
    provider: AIProvider.OPENAI,
    apiKey: 'sk-test',
  })),
}));

const c = createMockContext();
const connector = {} as UserDataStorageConnector;

/** The message the model was asked with. */
const askedWith = (): string =>
  (mockParse.mock.calls[0][0] as { messages: { content: string }[] })
    .messages[1].content;

describe('generateSeedSystemPromptWithContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParse.mockResolvedValue({
      choices: [{ message: { parsed: { system_prompt: 'Improved prompt' } } }],
    });
  });

  it('hands the model the seed prompt to improve on', async () => {
    // A skill the gateway created keeps its caller's prompt; regeneration
    // is asked to build on it rather than write another from the description.
    const result = await generateSeedSystemPromptWithContext(
      c,
      'An agent for restaurants.',
      'Books tables.',
      ['User: a table for two\nAssistant: Booked.'],
      connector,
      undefined,
      undefined,
      'You are the concierge. Always confirm the time.',
    );

    expect(result).toBe('Improved prompt');
    const message = askedWith();
    expect(message).toContain(
      'You are the concierge. Always confirm the time.',
    );
    expect(message).toContain('improve on it rather than replacing it');
    expect(message).toContain('Books tables.');
  });

  it('says nothing about a seed prompt when there is none', async () => {
    await generateSeedSystemPromptWithContext(
      c,
      'An agent for restaurants.',
      'Books tables.',
      ['User: a table for two\nAssistant: Booked.'],
      connector,
    );

    expect(askedWith()).not.toContain("developer's own system prompt");
  });
});
