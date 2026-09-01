import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import { resolveSystemSettingsModel } from '@api/utils/evaluation-model-resolver';
import {
  clearCompactedPrompts,
  compactSystemPrompt,
} from '@api/utils/super-agents/intent-compaction';
import { AIProvider } from '@shared/types/constants';
import { SYSTEM_PROMPT_BUDGET } from '@shared/utils/request-intent';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A system prompt too long to embed whole is compacted by a model, once per
 * distinct prompt, and truncation is the fallback whenever the model cannot
 * be asked -- routing must go on either way.
 */

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    withOptions: () => ({ chat: { completions: { create: mockCreate } } }),
  })),
}));

vi.mock('@api/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@api/constants')>()),
  getApiUrl: () => 'http://localhost:8787',
}));

vi.mock('@api/utils/evaluation-model-resolver', () => ({
  resolveSystemSettingsModel: vi.fn(),
}));

const connector = {} as UserDataStorageConnector;
const longPrompt = `You are a coding CLI. ${'x'.repeat(9000)}`;

describe('compactSystemPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCompactedPrompts();
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue({
      model: 'reflect-model',
      provider: AIProvider.OPENAI,
      apiKey: 'key',
    } as never);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'A coding CLI for the blog.' } }],
    });
  });

  it('compacts a prompt once and reuses the summary', async () => {
    const c = createMockContext();
    const first = await compactSystemPrompt(c, connector, longPrompt);
    const second = await compactSystemPrompt(c, connector, longPrompt);

    expect(first).toBe('A coding CLI for the blog.');
    expect(second).toBe(first);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    // Deterministic, so the identity embedding stays put across restarts.
    expect(mockCreate.mock.calls[0][0].temperature).toBe(0);
    expect(JSON.stringify(mockCreate.mock.calls[0])).toContain(
      'You are a coding CLI.',
    );
  });

  it('falls back to the head of the prompt when the model fails, and retries next time', async () => {
    const c = createMockContext();
    mockCreate.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const fallback = await compactSystemPrompt(c, connector, longPrompt);
    expect(fallback).toBe(longPrompt.slice(0, SYSTEM_PROMPT_BUDGET));

    // The failure was not kept: the next request asks again.
    const retried = await compactSystemPrompt(c, connector, longPrompt);
    expect(retried).toBe('A coding CLI for the blog.');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('falls back when no model is configured', async () => {
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue(null);

    const fallback = await compactSystemPrompt(
      createMockContext(),
      connector,
      longPrompt,
    );

    expect(fallback).toBe(longPrompt.slice(0, SYSTEM_PROMPT_BUDGET));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('bounds even a rambling summary to the embedding budget', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'y'.repeat(9000) } }],
    });

    const summary = await compactSystemPrompt(
      createMockContext(),
      connector,
      longPrompt,
    );

    expect(summary).toHaveLength(SYSTEM_PROMPT_BUDGET);
  });
});
