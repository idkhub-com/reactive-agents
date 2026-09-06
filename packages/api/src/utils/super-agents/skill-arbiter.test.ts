import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import {
  resolveModelById,
  resolveSystemSettingsModel,
} from '@api/utils/evaluation-model-resolver';
import { arbitrateSkillForRequest } from '@api/utils/super-agents/skill-arbiter';
import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import { AIProvider } from '@shared/types/constants';
import type { Agent, Skill, SystemSettings } from '@shared/types/data';
import { SystemSettingsOptions } from '@shared/types/data/system-settings';
import type { RequestIntent } from '@shared/utils/request-intent';
import OpenAI from 'openai';
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
  default: vi.fn(
    class {
      withOptions = () => ({ chat: { completions: { parse: mockParse } } });
    },
  ),
}));

vi.mock('@api/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@api/constants')>()),
  getApiUrl: () => 'http://localhost:8787',
}));

vi.mock('@api/utils/evaluation-model-resolver', () => ({
  resolveModelById: vi.fn(),
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
const settings = {
  skill_arbiter_model_id: null,
  intent_compaction_model_id: null,
  system_prompt_reflection_model_id: 'reflection-model',
  options: SystemSettingsOptions.parse({
    skill_arbiter: { timeout_ms: 42_000 },
    intent_compaction: { timeout_ms: 15_000 },
  }),
} as SystemSettings;

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
      settings,
    );

  it('takes its model and timeout from the settings it is handed', async () => {
    mockParse.mockResolvedValue(answer(null));

    await arbitrate();

    expect(resolveSystemSettingsModel).toHaveBeenCalledWith(
      expect.anything(),
      'skill_arbiter',
      connector,
      settings,
    );
    // One attempt within the configured time, and one retry.
    expect(vi.mocked(OpenAI).mock.calls[0][0]).toMatchObject({
      timeout: 42_000,
      maxRetries: 1,
    });
  });

  it("prefers the agent's own arbiter model and timeout", async () => {
    vi.mocked(resolveModelById).mockResolvedValue({
      model: 'agent-model',
      provider: AIProvider.OPENAI,
      apiKey: 'key',
    });
    mockParse.mockResolvedValue(answer(null));

    await arbitrateSkillForRequest(
      createMockContext(),
      connector,
      {
        ...agent,
        skill_arbiter_model_id: 'agent-arbiter-model',
        skill_arbiter_timeout_ms: 7_000,
      },
      skills,
      intent,
      settings,
    );

    expect(resolveModelById).toHaveBeenCalledWith(
      expect.anything(),
      'agent-arbiter-model',
      connector,
      expect.any(String),
    );
    expect(resolveSystemSettingsModel).not.toHaveBeenCalled();
    expect(vi.mocked(OpenAI).mock.calls[0][0]).toMatchObject({
      timeout: 7_000,
    });
    expect(mockParse.mock.calls[0][0]).toMatchObject({ model: 'agent-model' });
  });

  it("keeps the system's reasoning effort for an agent's own model", async () => {
    // An agent overrides *which* model arbitrates, not how hard it may think.
    // A model resolved by id carries no settings of its own, so the effort has
    // to be handed to it -- as the timeout in the same position always was.
    vi.mocked(resolveModelById).mockResolvedValue({
      model: 'agent-model',
      provider: AIProvider.OPENAI,
      apiKey: 'key',
    });
    mockParse.mockResolvedValue(answer(null));

    await arbitrateSkillForRequest(
      createMockContext(),
      connector,
      { ...agent, skill_arbiter_model_id: 'agent-arbiter-model' },
      skills,
      intent,
      {
        ...settings,
        options: SystemSettingsOptions.parse({
          skill_arbiter: {
            timeout_ms: 42_000,
            reasoning_effort: ReasoningEffort.NONE,
          },
        }),
      } as SystemSettings,
    );

    expect(mockParse.mock.calls[0][0]).toMatchObject({
      model: 'agent-model',
      reasoning_effort: 'none',
    });
  });

  it("sends none for an agent's own model when the system sets none", async () => {
    vi.mocked(resolveModelById).mockResolvedValue({
      model: 'agent-model',
      provider: AIProvider.OPENAI,
      apiKey: 'key',
    });
    mockParse.mockResolvedValue(answer(null));

    await arbitrateSkillForRequest(
      createMockContext(),
      connector,
      { ...agent, skill_arbiter_model_id: 'agent-arbiter-model' },
      skills,
      intent,
      settings,
    );

    expect(mockParse.mock.calls[0][0]).not.toHaveProperty('reasoning_effort');
  });

  it('sends the arbiter reasoning effort the settings chose', async () => {
    // A request waits for this answer, so the setting exists to keep the
    // model from thinking its way past the timeout.
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue({
      model: 'arbiter-model',
      provider: AIProvider.OPENAI,
      apiKey: 'k',
      timeoutMs: 42_000,
      reasoningEffort: ReasoningEffort.NONE,
    });
    mockParse.mockResolvedValue(answer(null));

    await arbitrateSkillForRequest(
      createMockContext(),
      connector,
      agent,
      skills,
      intent,
      settings,
    );

    expect(mockParse.mock.calls[0][0]).toMatchObject({
      reasoning_effort: 'none',
    });
  });

  it('sends none when the role leaves the model to its default', async () => {
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue({
      model: 'arbiter-model',
      provider: AIProvider.OPENAI,
      apiKey: 'k',
      timeoutMs: 42_000,
      reasoningEffort: null,
    });
    mockParse.mockResolvedValue(answer(null));

    await arbitrateSkillForRequest(
      createMockContext(),
      connector,
      agent,
      skills,
      intent,
      settings,
    );

    expect(mockParse.mock.calls[0][0]).not.toHaveProperty('reasoning_effort');
  });

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
