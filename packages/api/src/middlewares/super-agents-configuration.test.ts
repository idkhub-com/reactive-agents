import { saConfigurationInjectorMiddleware } from '@api/middlewares/super-agents-configuration';
import type { AppContext } from '@api/types/hono';
import { generateEmbeddingForRequest } from '@api/utils/embeddings';
import { resolveEmbeddingModelConfig } from '@api/utils/evaluation-model-resolver';
import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import {
  type SuperAgentsConfig,
  SuperAgentsConfigPreProcessed,
} from '@shared/types/api/request/headers';
import type { Skill } from '@shared/types/data';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@api/utils/embeddings', () => ({
  generateEmbeddingForRequest: vi.fn(),
}));
vi.mock('@api/utils/evaluation-model-resolver', () => ({
  resolveEmbeddingModelConfig: vi.fn(),
}));
vi.mock('@api/optimization/skill-optimizations', () => ({
  handleGenerateArms: vi.fn(),
}));

const skill = {
  id: 'skill-1',
  agent_id: 'agent-1',
  name: 'routed-skill',
  configuration_count: 1,
  exploration_temperature: 1,
  allowed_template_variables: [],
} as unknown as Skill;

const requestData = {
  functionName: FunctionName.CHAT_COMPLETE,
  requestBody: {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'hi' }],
  },
} as unknown as SuperAgentsRequestData;

/** A context carrying what the earlier middlewares would have set. */
const context = (
  preProcessed: SuperAgentsConfigPreProcessed,
  connector: Record<string, unknown>,
) => {
  const vars = new Map<string, unknown>([
    ['sa_config_pre_processed', preProcessed],
    ['sa_request_data', requestData],
    ['user_data_storage_connector', connector],
    ['skill', skill],
  ]);
  return {
    req: { url: 'http://localhost/v1/chat/completions' },
    get: (key: string) => vars.get(key),
    set: vi.fn((key: string, value: unknown) => vars.set(key, value)),
    json: vi.fn(
      (body: unknown, status: number) =>
        new Response(JSON.stringify(body), { status }),
    ),
  } as unknown as AppContext;
};

/** The last value the middleware stored under `key`. */
const setValue = (c: AppContext, key: string): unknown =>
  (vi.mocked(c.set).mock.calls as unknown as [string, unknown][])
    .filter(([name]) => name === key)
    .at(-1)?.[1];

describe('saConfigurationInjectorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateEmbeddingForRequest).mockResolvedValue([1, 0]);
  });

  it('fills the routed skill name into the resolved config', async () => {
    // The caller named only the agent; `agentAndSkillMiddleware` put the
    // skill it picked on the context, and the header never carried its name.
    const preProcessed = SuperAgentsConfigPreProcessed.parse({
      agent_name: 'helper',
      targets: [{ provider: 'openai', model: 'gpt-4o' }],
    });
    const c = context(preProcessed, {});
    const next = vi.fn();

    await saConfigurationInjectorMiddleware(c, next);

    expect(next).toHaveBeenCalled();
    const saConfig = setValue(c, 'sa_config') as SuperAgentsConfig;
    expect(saConfig.agent_name).toBe('helper');
    expect(saConfig.skill_name).toBe('routed-skill');
    expect(saConfig.targets[0].configuration.model).toBe('gpt-4o');
  });

  it('keeps a skill name the caller did give', async () => {
    const preProcessed = SuperAgentsConfigPreProcessed.parse({
      agent_name: 'helper',
      skill_name: 'named-skill',
      targets: [{ provider: 'openai', model: 'gpt-4o' }],
    });
    const c = context(preProcessed, {});

    await saConfigurationInjectorMiddleware(c, vi.fn());

    const saConfig = setValue(c, 'sa_config') as SuperAgentsConfig;
    expect(saConfig.skill_name).toBe('named-skill');
  });

  it('answers 422 when the optimized skill has no arms to serve with', async () => {
    // A skill without models has clusters but no arms -- a skill the gateway
    // created for an agent without default models, for instance.
    const preProcessed = SuperAgentsConfigPreProcessed.parse({
      agent_name: 'helper',
      skill_name: 'routed-skill',
    });
    vi.mocked(resolveEmbeddingModelConfig).mockResolvedValue({
      modelId: 'embed-model',
      dimensions: 2,
    } as never);
    const c = context(preProcessed, {
      getSkillOptimizationClusters: vi
        .fn()
        .mockResolvedValue([{ id: 'cluster-1', centroid: [1, 0] }]),
      getSkillOptimizationArms: vi.fn().mockResolvedValue([]),
      getSkillModels: vi.fn().mockResolvedValue([]),
    });
    const next = vi.fn();

    const response = (await saConfigurationInjectorMiddleware(
      c,
      next,
    )) as Response;

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('routed-skill');
    expect(body.error).toContain('no configurations');
  });

  it('names the missing default models for a skill the gateway created', async () => {
    const preProcessed = SuperAgentsConfigPreProcessed.parse({
      agent_name: 'helper',
      skill_name: 'routed-skill',
    });
    vi.mocked(resolveEmbeddingModelConfig).mockResolvedValue({
      modelId: 'embed-model',
      dimensions: 2,
    } as never);
    const c = context(preProcessed, {
      getSkillOptimizationClusters: vi
        .fn()
        .mockResolvedValue([{ id: 'cluster-1', centroid: [1, 0] }]),
      getSkillOptimizationArms: vi.fn().mockResolvedValue([]),
      getSkillModels: vi.fn().mockResolvedValue([]),
    });
    (c.set as unknown as (k: string, v: unknown) => void)('skill', {
      ...skill,
      auto_created: true,
    });
    (c.set as unknown as (k: string, v: unknown) => void)('agent', {
      id: 'agent-1',
      name: 'helper',
    });

    const response = (await saConfigurationInjectorMiddleware(
      c,
      vi.fn(),
    )) as Response;

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('created automatically');
    expect(body.error).toContain('agent helper had no default models');
  });
});
