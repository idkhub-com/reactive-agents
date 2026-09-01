import {
  logsMiddleware,
  truncateOversizedResponseBody,
} from '@api/middlewares/logs';
import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@api/types/connector';
import type { AppEnv } from '@api/types/hono';
import type { SkillRoutingDecision } from '@api/utils/super-agents/skill-routing';
import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import type { SuperAgentsConfig } from '@shared/types/api/request/headers';
import type { Agent, Skill } from '@shared/types/data';
import type { AIProviderRequestLog } from '@shared/types/data/log';
import { HttpMethod } from '@shared/types/http';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Everything the pipeline does after the log is stored is someone else's test.
vi.mock('@api/middlewares/optimizer/clusters', () => ({
  autoClusterSkill: vi.fn(),
}));
vi.mock('@api/middlewares/optimizer/system-prompt', () => ({
  autoGenerateSystemPromptsForSkill: vi.fn(),
}));
vi.mock('@api/middlewares/optimizer/evaluations', () => ({
  checkAndRegenerateEvaluationsEarly: vi.fn(),
  addSkillOptimizationEvaluationRun: vi.fn(),
}));
vi.mock('@api/middlewares/optimizer/hyperparameters', () => ({
  updatePulledArm: vi.fn(),
}));
vi.mock('@api/utils/sse-event-manager', () => ({ emitSSEEvent: vi.fn() }));

const agent = { id: 'agent-1', name: 'helper', description: 'Helps.' } as Agent;
const skill = { id: 'skill-1', agent_id: 'agent-1', name: 'routed' } as Skill;
const saConfig = {
  agent_name: 'helper',
  skill_name: 'routed',
  trace_id: 'trace-1',
} as unknown as SuperAgentsConfig;
const decision: SkillRoutingDecision = {
  method: 'embedding',
  similarity: 0.93,
  threshold: 0.8,
  candidates: 2,
};

/** What the provider was actually sent, arm prompt and all. */
const aiProviderLog = {
  provider: 'openai',
  function_name: FunctionName.CHAT_COMPLETE,
  method: HttpMethod.POST,
  request_url: 'https://api.openai.com/v1/chat/completions',
  status: 200,
  request_body: {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'The arm prompt' },
      { role: 'user', content: 'hi' },
    ],
  },
  response_body: { id: 'chatcmpl-1', choices: [] },
  raw_request_body: '{}',
  raw_response_body: '{"id":"chatcmpl-1"}',
  cache_mode: 'disabled',
  cache_status: 'MISS',
} as unknown as AIProviderRequestLog;

describe('logsMiddleware', () => {
  let requestData: SuperAgentsRequestData;
  let logsConnector: { createLog: ReturnType<typeof vi.fn> };
  let app: Hono<AppEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    requestData = {
      functionName: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      url: 'http://localhost/v1/chat/completions',
      requestBody: {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are the caller.' },
          { role: 'user', content: 'hi' },
        ],
      },
    } as unknown as SuperAgentsRequestData;
    logsConnector = {
      createLog: vi
        .fn()
        .mockImplementation(async (_c, params) => ({ ...params, id: 'log-1' })),
    };
    const userData = {
      incrementSkillTotalRequests: vi.fn(),
      getSkillOptimizationEvaluations: vi.fn().mockResolvedValue([]),
    } as unknown as UserDataStorageConnector;

    const factory = createFactory<AppEnv>();
    app = new Hono<AppEnv>()
      // What `commonVariablesMiddleware` and the user-data middleware leave.
      .use('*', async (c, next) => {
        c.set('sa_request_data', requestData);
        c.set('user_data_storage_connector', userData);
        await next();
      })
      .use(
        '*',
        logsMiddleware(
          factory,
          () => logsConnector as unknown as LogsStorageConnector,
        ),
      )
      .post('/v1/chat/completions', (c) => {
        c.set('sa_config', saConfig);
        c.set('agent', agent);
        c.set('skill', skill);
        c.set('skill_routing', decision);
        c.set('ai_provider_log', aiProviderLog);
        // The handler splices the arm's prompt into the request it forwards.
        (requestData.requestBody as { messages: unknown[] }).messages[0] = {
          role: 'system',
          content: 'The arm prompt',
        };
        return c.json({ ok: true });
      });
  });

  const storedLog = async () => {
    await vi.waitFor(() =>
      expect(logsConnector.createLog).toHaveBeenCalledTimes(1),
    );
    return logsConnector.createLog.mock.calls[0][1] as Record<string, unknown>;
  };

  it('keeps the system prompt the caller sent, read before the handler ran', async () => {
    const response = await app.request('/v1/chat/completions', {
      method: 'POST',
    });
    expect(response.status).toBe(200);

    const log = await storedLog();
    expect(log.original_system_prompt).toBe('You are the caller.');
    expect(log.skill_id).toBe('skill-1');
    expect(log.agent_id).toBe('agent-1');
  });

  it('records how the skill was chosen', async () => {
    await app.request('/v1/chat/completions', { method: 'POST' });

    const log = await storedLog();
    expect(log.metadata).toEqual({ skill_routing: decision });
  });

  it('leaves the metadata empty when the caller named the skill', async () => {
    app = new Hono<AppEnv>()
      .use('*', async (c, next) => {
        c.set('sa_request_data', requestData);
        await next();
      })
      .use(
        '*',
        logsMiddleware(
          createFactory<AppEnv>(),
          () => logsConnector as unknown as LogsStorageConnector,
        ),
      )
      .post('/v1/chat/completions', (c) => {
        c.set('sa_config', saConfig);
        c.set('agent', agent);
        c.set('skill', skill);
        c.set('ai_provider_log', aiProviderLog);
        return c.json({ ok: true });
      });

    await app.request('/v1/chat/completions', { method: 'POST' });

    const log = await storedLog();
    expect(log.metadata).toEqual({});
    expect(log.original_system_prompt).toBe('You are the caller.');
  });
});

describe('truncateOversizedResponseBody', () => {
  const logOf = (responseBody: unknown): AIProviderRequestLog =>
    ({
      provider: 'openai',
      function_name: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      request_url: 'https://example.test/v1/chat/completions',
      status: 200,
      // A request body far past the limit on its own: the guard used to
      // measure the whole row, so a big *request* destroyed the response.
      request_body: { model: 'test-model', context: 'x'.repeat(200_000) },
      response_body: responseBody,
    }) as unknown as AIProviderRequestLog;

  it('keeps a normal response body, however large the rest of the log', () => {
    const log = logOf({ id: 'chatcmpl-1', choices: [] });

    truncateOversizedResponseBody(log);

    expect(log.response_body).toEqual({ id: 'chatcmpl-1', choices: [] });
  });

  it('replaces an oversized response body with its own truncated head', () => {
    const log = logOf({ content: 'y'.repeat(200_000) });

    truncateOversizedResponseBody(log);

    expect(log.response_body).toMatchObject({
      message:
        'The response was too large to be processed. It has been truncated.',
    });
    const replaced = log.response_body as unknown as { response: string };
    expect(replaced.response.startsWith('{"content":"yyy')).toBe(true);
    expect(replaced.response.length).toBeLessThanOrEqual(100_003);
  });
});
