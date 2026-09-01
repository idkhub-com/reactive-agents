import {
  describeSkillForRequest,
  heuristicSkillNaming,
  slugifySkillName,
  uniqueSkillName,
} from '@api/optimization/utils/describe-skill';
import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import { resolveSystemSettingsModel } from '@api/utils/evaluation-model-resolver';
import { AIProvider } from '@shared/types/constants';
import type { Agent } from '@shared/types/data';
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
  resolveSystemSettingsModel: vi.fn(),
}));

describe('slugifySkillName', () => {
  it('produces a name the skill schema accepts', () => {
    expect(slugifySkillName('Summarize Support Tickets!')).toBe(
      'summarize-support-tickets',
    );
    expect(slugifySkillName('  --Hello, World--  ')).toBe('hello-world');
  });

  it('caps the length without leaving a dangling hyphen', () => {
    const name = slugifySkillName(`${'a'.repeat(30)} ${'b'.repeat(30)}`);
    expect(name).toBe(`${'a'.repeat(30)}-${'b'.repeat(9)}`);
    expect(slugifySkillName(`${'a'.repeat(39)} b`)).toBe('a'.repeat(39));
  });

  it('falls back when nothing usable is left', () => {
    expect(slugifySkillName('!!')).toBe('skill');
    expect(slugifySkillName('')).toBe('skill');
  });
});

describe('uniqueSkillName', () => {
  it('keeps a free name and suffixes a taken one', () => {
    expect(uniqueSkillName('translate', [])).toBe('translate');
    expect(uniqueSkillName('translate', ['translate'])).toBe('translate-2');
    expect(uniqueSkillName('translate', ['translate', 'translate-2'])).toBe(
      'translate-3',
    );
  });

  it('keeps the suffixed name within the length cap', () => {
    const base = 'x'.repeat(40);
    expect(uniqueSkillName(base, [base])).toBe(`${'x'.repeat(38)}-2`);
  });
});

describe('heuristicSkillNaming', () => {
  it('names the skill after the first words of the instructions', () => {
    const naming = heuristicSkillNaming(
      'You are a restaurant concierge.\nBe brief.',
    );
    expect(naming.name).toBe('you-are-a-restaurant-concierge');
    expect(naming.description).toContain('You are a restaurant concierge.');
    expect(naming.description.length).toBeGreaterThanOrEqual(25);
  });

  it('quotes at most the start of a long prompt', () => {
    const naming = heuristicSkillNaming('a'.repeat(5000));
    expect(naming.description.length).toBeLessThan(600);
  });
});

describe('describeSkillForRequest', () => {
  const c = createMockContext();
  const connector = {} as UserDataStorageConnector;
  const agent = {
    id: 'agent-1',
    name: 'helper',
    description: 'Helps guests of the restaurant with anything they need.',
  } as Agent;
  const intent = 'You are a restaurant concierge.\n\nTools: book_table';

  /** What the model answered, in the shape the OpenAI client hands back. */
  const modelSays = (parsed: unknown) =>
    mockParse.mockResolvedValue({ choices: [{ message: { parsed } }] });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue({
      model: 'gpt-5-mini',
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test',
    });
  });

  it('takes the name and description the model gives', async () => {
    modelSays({
      name: 'Restaurant Concierge!',
      description: 'Books tables and answers questions about the restaurant.',
    });

    const naming = await describeSkillForRequest(c, connector, agent, intent, [
      'translate',
    ]);

    expect(naming).toEqual({
      name: 'restaurant-concierge',
      description: 'Books tables and answers questions about the restaurant.',
    });
    // The intent and the names to avoid both reach the model.
    const request = mockParse.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    expect(request.messages[1].content).toContain('book_table');
    expect(request.messages[1].content).toContain('translate');
  });

  it('names the skill from the request when no model is configured', async () => {
    vi.mocked(resolveSystemSettingsModel).mockResolvedValue(null);

    const naming = await describeSkillForRequest(
      c,
      connector,
      agent,
      intent,
      [],
    );

    expect(naming).toEqual(heuristicSkillNaming(intent));
    expect(mockParse).not.toHaveBeenCalled();
  });

  it('falls back when the answer does not fit', async () => {
    modelSays({ title: 'not the schema' });

    const naming = await describeSkillForRequest(
      c,
      connector,
      agent,
      intent,
      [],
    );

    expect(naming).toEqual(heuristicSkillNaming(intent));
  });

  it('falls back when the model call fails', async () => {
    mockParse.mockRejectedValue(new Error('provider down'));

    const naming = await describeSkillForRequest(
      c,
      connector,
      agent,
      intent,
      [],
    );

    expect(naming).toEqual(heuristicSkillNaming(intent));
  });

  it('keeps a usable name but replaces a description too short to store', async () => {
    // `SkillCreateParams` insists on 25 characters.
    modelSays({ name: 'concierge', description: 'Books tables.' });

    const naming = await describeSkillForRequest(
      c,
      connector,
      agent,
      intent,
      [],
    );

    expect(naming.name).toBe('concierge');
    expect(naming.description).toBe(heuristicSkillNaming(intent).description);
  });

  it('replaces a name with nothing usable in it', async () => {
    modelSays({
      name: '???',
      description: 'Books tables and answers questions about the restaurant.',
    });

    const naming = await describeSkillForRequest(
      c,
      connector,
      agent,
      intent,
      [],
    );

    expect(naming.name).toBe(heuristicSkillNaming(intent).name);
  });
});
