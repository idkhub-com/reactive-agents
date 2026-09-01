import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import { resolveSystemSettingsModel } from '@api/utils/evaluation-model-resolver';
import { arbitrateSkillForRequest } from '@api/utils/super-agents/skill-arbiter';
import { AIProvider } from '@shared/types/constants';
import type { Agent, Skill } from '@shared/types/data';
import type { RequestIntent } from '@shared/utils/request-intent';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The arbiter makes the one call embeddings cannot: whether a request that
 * matched no skill closely is a new kind of job, or a familiar job on
 * unfamiliar material. What matters here: its verdicts map to the right
 * kinds, an unknown or malformed answer stays conservative, and the prompt
 * carries what the model needs to judge with.
 */

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
  resolveSystemSettingsModel: vi.fn(),
}));

const connector = {} as UserDataStorageConnector;
const agent = {
  id: 'agent-1',
  name: 'helper',
  description: 'Maintains the blog and its supporting tools.',
} as Agent;
const skills = [
  {
    id: 's1',
    name: 'maintain-blog-codebase',
    description: 'Implements changes to the blog codebase.',
  },
  {
    id: 's2',
    name: 'generate-thread-titles',
    description: 'Titles a conversation in a few words.',
  },
] as Skill[];
const intent: RequestIntent = {
  systemPrompt: 'You are a coding CLI.',
  tools: 'Tools: read, write',
  conversation: 'User: create a new draft post about the renaming',
};

const answer = (skillName: string | null) => ({
  choices: [{ message: { parsed: { skill_name: skillName } } }],
});

describe('arbitrateSkillForRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue({
      model: 'judge-model',
      provider: AIProvider.OPENAI,
      apiKey: 'key',
    } as never);
  });

  const arbitrate = () =>
    arbitrateSkillForRequest(
      createMockContext(),
      connector,
      agent,
      skills,
      intent,
    );

  it('maps a named skill to an existing verdict', async () => {
    mockParse.mockResolvedValue(answer('generate-thread-titles'));

    const verdict = await arbitrate();

    expect(verdict).toEqual({ kind: 'existing', skill: skills[1] });
    // The model saw the skills and both halves of the request.
    const prompt = JSON.stringify(mockParse.mock.calls[0]);
    expect(prompt).toContain('maintain-blog-codebase');
    expect(prompt).toContain('You are a coding CLI.');
    expect(prompt).toContain('create a new draft post');
  });

  it('maps a null skill to a new-job verdict', async () => {
    mockParse.mockResolvedValue(answer(null));

    expect(await arbitrate()).toEqual({ kind: 'new' });
  });

  it('is unavailable when the model names a skill the agent does not have', async () => {
    mockParse.mockResolvedValue(answer('made-up-skill'));

    expect(await arbitrate()).toEqual({ kind: 'unavailable' });
  });

  it('is unavailable when the answer has the wrong shape', async () => {
    mockParse.mockResolvedValue({ choices: [{ message: { parsed: null } }] });

    expect(await arbitrate()).toEqual({ kind: 'unavailable' });
  });

  it('is unavailable when the model cannot be reached', async () => {
    mockParse.mockRejectedValue(new Error('connect ECONNREFUSED'));

    expect(await arbitrate()).toEqual({ kind: 'unavailable' });
  });

  it('is unavailable without a configured model, and asks nothing', async () => {
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue(null);

    expect(await arbitrate()).toEqual({ kind: 'unavailable' });
    expect(mockParse).not.toHaveBeenCalled();
  });
});
