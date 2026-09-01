import { type APIRequestContext, expect, test } from '@playwright/test';
import {
  AGENTS_PATH,
  type Agent,
  addModelsToAgent,
  createAgent,
  getSkillRoutings,
  uniqueAgentName,
} from '../fixtures/agents';
import {
  CHAT_COMPLETIONS_PATH,
  chatBody,
  STUB_URL,
  stubRequests,
} from '../fixtures/gateway';
import { getLogs } from '../fixtures/logs';
import {
  getArms,
  getClusters,
  type OptimizedSkill,
  optimizedConfig,
  STUB_SYSTEM_PROMPT,
  type StubModels,
  setUpOptimizedSkill,
  setUpStubModels,
} from '../fixtures/optimizer';
import {
  createSkill,
  getSkillEvaluations,
  getSkillModels,
  getSkills,
  type Skill,
} from '../fixtures/skills';

/**
 * The self-optimization loop, running for real against the stub provider.
 *
 * The internal skills -- prompt seeding, embedding, judging, evaluation
 * generation -- are ordinary gateway requests the server sends back to its own
 * `/v1`, resolved through system settings. Nothing about that path is
 * observable from unit tests, and until now nothing exercised it end to end:
 * the loop could stop working entirely and every ordinary request would carry
 * on being served, because each internal call swallows its own errors.
 *
 * Serial, because system settings are a single global row that the whole
 * deployment shares.
 */
test.describe.configure({ mode: 'serial' });

test.describe('optimization loop', () => {
  let configured: OptimizedSkill;

  test.beforeAll(async ({ request }, testInfo) => {
    /**
     * Scoped by project: both storage backends run this file against their own
     * server but share one stub, which buckets traffic by model name. The
     * project name is sanitised because it becomes part of an agent name, and
     * those permit only lowercase letters, digits, `_` and `-`.
     */
    const scope = `opt-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-')}`;
    configured = await setUpOptimizedSkill(request, scope.toLowerCase());
  });

  test('generates a cluster per configuration', async ({ request }) => {
    // `configuration_count` is what the skill asked for, and the clusters are
    // what the request router later picks between.
    expect(await getClusters(request, configured.skillId)).toHaveLength(3);
  });

  test('generates arms carrying a prompt written by the internal skill', async ({
    request,
  }) => {
    /**
     * The end-to-end proof that the internal skills are wired up. That prompt
     * text can only exist if the seeding skill resolved a model from system
     * settings, called back into this server's own `/v1`, reached the stub
     * through the provider's `custom_host`, and had its structured output
     * parsed and stored.
     */
    const arms = await getArms(request, configured.skillId);

    expect(arms.length).toBeGreaterThan(0);
    for (const arm of arms) {
      expect(arm.params.system_prompt).toBe(STUB_SYSTEM_PROMPT);
    }
  });

  test('spreads arms across every cluster', async ({ request }) => {
    // An arm belongs to exactly one cluster; a cluster with none would be
    // unusable, and requests routed to it would have nothing to select.
    const clusters = await getClusters(request, configured.skillId);
    const arms = await getArms(request, configured.skillId);

    const populated = new Set(arms.map((arm) => arm.cluster_id));
    expect(populated.size).toBe(clusters.length);
  });

  test('serves an optimized request with the generated prompt', async ({
    request,
  }) => {
    /**
     * The whole loop in one request: embed the input, route it to a cluster,
     * sample an arm, and send that arm's generated system prompt to the
     * provider. The prompt is asserted at the provider, because the client
     * never sees which configuration served it.
     */
    const response = await request.post(CHAT_COMPLETIONS_PATH, {
      headers: {
        'sa-config': optimizedConfig(
          configured.agentName,
          configured.skillName,
        ),
      },
      data: chatBody('plan a trip to Lisbon'),
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    expect(body.choices[0].message.content).toBe('echo: plan a trip to Lisbon');

    const forwarded = await stubRequests(request, configured.textModel);
    const served = forwarded[forwarded.length - 1] as {
      messages: { role: string; content: string }[];
    };
    expect(served.messages[0]).toEqual({
      role: 'system',
      content: STUB_SYSTEM_PROMPT,
    });
    expect(served.messages[1].content).toBe('plan a trip to Lisbon');
  });

  test('keeps the caller system prompt on the log it replaced', async ({
    request,
  }) => {
    /**
     * On an optimized skill the client's own system prompt never reaches the
     * provider -- the arm's does -- and `ai_provider_request_log` records the
     * body as it was sent. The log is the only place the client's prompt
     * survives, so it is checked here on both backends.
     */
    const userMessage = 'book a table for two';
    const response = await request.post(CHAT_COMPLETIONS_PATH, {
      headers: {
        'sa-config': optimizedConfig(
          configured.agentName,
          configured.skillName,
        ),
      },
      data: {
        ...chatBody(userMessage),
        messages: [
          { role: 'system', content: 'You are a restaurant concierge.' },
          { role: 'user', content: userMessage },
        ],
      },
    });
    expect(response.status()).toBe(200);

    const forwarded = await stubRequests(request, configured.textModel);
    const served = forwarded[forwarded.length - 1] as {
      messages: { role: string; content: string }[];
    };
    expect(served.messages[0]).toEqual({
      role: 'system',
      content: STUB_SYSTEM_PROMPT,
    });

    await expect
      .poll(async () => {
        const logs = await getLogs(request, configured.skillId);
        const logged = logs.find((log) =>
          log.ai_provider_request_log.request_body.messages?.some(
            (message) => message.content === userMessage,
          ),
        );
        return logged?.original_system_prompt;
      })
      .toBe('You are a restaurant concierge.');
  });

  test('embeds the request through the embedding skill', async ({
    request,
  }) => {
    // Routing to a cluster is a cosine comparison against the request's
    // embedding, so without this call the optimized path cannot run at all --
    // it falls back and reports that no provider was configured.
    expect(
      await stubRequests(request, configured.embeddingModel),
    ).not.toHaveLength(0);
  });
});

/** A chat completion to the agent-only path, with a plain (unoptimized) target. */
const chatToAgent = (
  request: APIRequestContext,
  agent: string,
  textModel: string,
  systemPrompt: string,
  content: string,
  config: Record<string, unknown> = {},
) =>
  request.post(`/v1/agents/${agent}/chat/completions`, {
    headers: {
      'sa-config': JSON.stringify({
        ...config,
        targets: [
          { provider: 'ollama', custom_host: STUB_URL, model: textModel },
        ],
      }),
    },
    data: {
      model: 'ignored-by-the-gateway',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    },
  });

/**
 * How the log carrying `content` under `skillId` says its skill was chosen:
 * the routing method, `named` when the caller named it, or undefined when no
 * such log exists (yet -- logs are written after the response).
 */
const decisionFor = async (
  request: APIRequestContext,
  skillId: string,
  content: string,
): Promise<string | undefined> => {
  const logs = await getLogs(request, skillId);
  const log = logs.find((entry) =>
    entry.ai_provider_request_log.request_body.messages?.some(
      (message) => message.content === content,
    ),
  );
  if (!log) {
    return undefined;
  }
  const routing = log.metadata.skill_routing as { method: string } | undefined;
  return routing?.method ?? 'named';
};

/**
 * Routing when the caller names only the agent (`/v1/agents/:agent_name/...`).
 *
 * In this file rather than its own because choosing between several skills
 * goes through the embedding model in system settings -- the global row the
 * loop above also configures -- and spec files run in parallel.
 */
test.describe('skill routing', () => {
  let stub: StubModels;
  let agentName: string;
  let translate: Skill;
  let sql: Skill;

  test.beforeAll(async ({ request }, testInfo) => {
    const scope =
      `route-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-')}`.toLowerCase();
    stub = await setUpStubModels(request, scope);

    // Skills made by hand, so creation stays out of these tests.
    const agent = await createAgent(
      request,
      uniqueAgentName(scope),
      undefined,
      {
        auto_create_skills: false,
      },
    );
    agentName = agent.name;
    // The stub embeds a `vec(...)` marker verbatim, so each description pins
    // its skill to an axis and a request picks one by carrying the same.
    translate = await createSkill(request, agent.id, 'translate', {
      description:
        'Translates whatever the user sends into another language. vec(1,0,0,0,0,0,0,0)',
    });
    sql = await createSkill(request, agent.id, 'write_sql', {
      description:
        'Writes SQL queries against the analytics warehouse. vec(0,1,0,0,0,0,0,0)',
    });
  });

  test('routes a request to the skill its intent is closest to', async ({
    request,
  }) => {
    const response = await chatToAgent(
      request,
      agentName,
      stub.textModel,
      'Translate the message. vec(1,0,0,0,0,0,0,0)',
      'hola mundo',
    );

    expect(response.status()).toBe(200);
    await expect
      .poll(() => decisionFor(request, translate.id, 'hola mundo'))
      .toBe('embedding');
    expect(await decisionFor(request, sql.id, 'hola mundo')).toBeUndefined();
  });

  test('tells the skills apart by the prompt, not by creation order', async ({
    request,
  }) => {
    const response = await chatToAgent(
      request,
      agentName,
      stub.textModel,
      'Write the query. vec(0,1,0,0,0,0,0,0)',
      'monthly revenue',
    );

    expect(response.status()).toBe(200);
    await expect
      .poll(() => decisionFor(request, sql.id, 'monthly revenue'))
      .toBe('embedding');
  });

  test('still honours a skill named in the header', async ({ request }) => {
    // A translate-shaped prompt sent to the SQL skill by name: the name wins.
    const response = await chatToAgent(
      request,
      agentName,
      stub.textModel,
      'Translate the message. vec(1,0,0,0,0,0,0,0)',
      'buenos dias',
      { skill_name: sql.name },
    );

    expect(response.status()).toBe(200);
    await expect
      .poll(() => decisionFor(request, sql.id, 'buenos dias'))
      .toBe('named');
  });

  test('uses the only skill of an agent that does not create skills', async ({
    request,
  }) => {
    const agent = await createAgent(
      request,
      uniqueAgentName('route-single'),
      undefined,
      { auto_create_skills: false },
    );
    const only = await createSkill(request, agent.id, 'only_skill');

    const response = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      'Anything.',
      'ping',
    );

    expect(response.status()).toBe(200);
    await expect
      .poll(() => decisionFor(request, only.id, 'ping'))
      .toBe('only_skill');
  });

  test('refuses an agent that has no skills and does not create them', async ({
    request,
  }) => {
    const agent = await createAgent(
      request,
      uniqueAgentName('route-empty'),
      undefined,
      { auto_create_skills: false },
    );

    const response = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      'Anything.',
      'ping',
    );

    expect(response.status()).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('has no skills');
  });

  test('learns what a skill is for from a request that names it', async ({
    request,
  }) => {
    const agent = await createAgent(
      request,
      uniqueAgentName('route-learn'),
      undefined,
      { auto_create_skills: false },
    );
    const translate = await createSkill(request, agent.id, 'translate', {
      description:
        'Translates whatever the user sends into another language. vec(1,0,0,0,0,0,0,0)',
    });
    const sql = await createSkill(request, agent.id, 'write_sql', {
      description:
        'Writes SQL queries against the analytics warehouse. vec(0,1,0,0,0,0,0,0)',
    });
    // Closer to translate's description than to sql's -- so by description
    // alone this prompt would be routed to translate.
    const prompt = 'Report on the data. vec(0.8,0.6,0,0,0,0,0,0)';

    const named = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      prompt,
      'sales last week',
      { skill_name: sql.name },
    );
    expect(named.status()).toBe(200);
    // The router learns once the response is out; the row says when it has.
    await expect
      .poll(
        async () =>
          (await getSkillRoutings(request, agent.id)).find(
            (row) => row.skill_id === sql.id,
          )?.sample_count,
      )
      .toBe(1);

    const routed = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      prompt,
      'sales this week',
    );
    expect(routed.status()).toBe(200);
    await expect
      .poll(() => decisionFor(request, sql.id, 'sales this week'))
      .toBe('embedding');
    expect(
      await decisionFor(request, translate.id, 'sales this week'),
    ).toBeUndefined();
  });
});

/**
 * Skills the gateway creates for requests that resemble none of the agent's.
 * Serial with the block above for the same reason: system settings.
 */
test.describe('skill creation', () => {
  let stub: StubModels;
  let agent: Agent;
  const conciergePrompt =
    'You are a restaurant concierge. vec(1,0,0,0,0,0,0,0)';

  test.beforeAll(async ({ request }, testInfo) => {
    const scope =
      `create-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-')}`.toLowerCase();
    stub = await setUpStubModels(request, scope);
    agent = await createAgent(request, uniqueAgentName(scope));
    // What the created skills start with; without it they could not serve an
    // optimized request.
    await addModelsToAgent(request, agent.id, [stub.textId]);
  });

  test('creates the first skill from the first request, seeded with its prompt', async ({
    request,
  }) => {
    const response = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      conciergePrompt,
      'a table for two',
    );
    expect(response.status()).toBe(200);

    const skills = await getSkills(request, { agent_id: agent.id });
    expect(skills).toHaveLength(1);
    const [created] = skills;
    expect(created.auto_created).toBe(true);
    expect(created.seed_system_prompt).toBe(conciergePrompt);
    expect(created.optimize).toBe(true);

    // Day one is a pass-through: every arm carries the caller's own prompt.
    const arms = await getArms(request, created.id);
    expect(arms.length).toBeGreaterThan(0);
    for (const arm of arms) {
      expect(arm.params.system_prompt).toBe(conciergePrompt);
    }

    await expect
      .poll(() => decisionFor(request, created.id, 'a table for two'))
      .toBe('created');
  });

  test('serves an optimized request through the new skill with the caller prompt', async ({
    request,
  }) => {
    // No sa-config at all: the plainest possible client, so the target is the
    // optimized configuration and the arm's prompt is what reaches the provider.
    const response = await request.post(
      `/v1/agents/${agent.name}/chat/completions`,
      {
        data: {
          model: 'ignored-by-the-gateway',
          messages: [
            { role: 'system', content: conciergePrompt },
            { role: 'user', content: 'a table for four' },
          ],
        },
      },
    );

    expect(response.status()).toBe(200);
    expect(await getSkills(request, { agent_id: agent.id })).toHaveLength(1);

    const forwarded = await stubRequests(request, stub.textModel);
    const served = forwarded[forwarded.length - 1] as {
      messages: { role: string; content: string }[];
    };
    expect(served.messages[0]).toEqual({
      role: 'system',
      content: conciergePrompt,
    });
    expect(served.messages[1].content).toBe('a table for four');
  });

  test('gives a request unlike any skill a skill of its own', async ({
    request,
  }) => {
    const response = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      'You write SQL for the warehouse. vec(0,1,0,0,0,0,0,0)',
      'monthly revenue by region',
    );

    expect(response.status()).toBe(200);
    const skills = await getSkills(request, { agent_id: agent.id });
    expect(skills).toHaveLength(2);
    expect(new Set(skills.map((skill) => skill.name)).size).toBe(2);
    expect(skills.every((skill) => skill.auto_created)).toBe(true);

    // The arbiter was asked before anything was created: its call went
    // through the reflection model in system settings, which is the stub.
    const forwarded = await stubRequests(request, stub.textModel);
    expect(JSON.stringify(forwarded)).toContain(
      'You route requests for an AI gateway agent',
    );
  });

  test('stops creating at the agent cap and routes to the closest skill', async ({
    request,
  }) => {
    const patched = await request.patch(`${AGENTS_PATH}/${agent.id}`, {
      data: { max_auto_created_skills: 2 },
    });
    expect(patched.status()).toBe(200);

    const response = await chatToAgent(
      request,
      agent.name,
      stub.textModel,
      'You draw pictures. vec(0,0,1,0,0,0,0,0)',
      'a cat on a mat',
    );

    expect(response.status()).toBe(200);
    expect(await getSkills(request, { agent_id: agent.id })).toHaveLength(2);
  });

  test('gives default models added later to a skill created without them', async ({
    request,
  }) => {
    // An agent with nothing to give its skills: the first request still
    // creates one, but it cannot serve until the agent has default models.
    // No sa-config, as the plainest client sends: a named target would be
    // served as it is, and it is the optimized configuration that needs arms.
    const bare = await createAgent(request, uniqueAgentName('create-bare'));
    const prompt = 'You are a florist. vec(0,0,0,0,1,0,0,0)';
    const plainChat = (content: string) =>
      request.post(`/v1/agents/${bare.name}/chat/completions`, {
        data: {
          model: 'ignored-by-the-gateway',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content },
          ],
        },
      });

    const refused = await plainChat('a bouquet');
    expect(refused.status()).toBe(422);
    const body = (await refused.json()) as { error: string };
    expect(body.error).toContain('created automatically');
    expect(body.error).toContain(`agent ${bare.name} had no default models`);
    const [created] = await getSkills(request, { agent_id: bare.id });
    expect(created.auto_created).toBe(true);
    expect(await getSkillModels(request, created.id)).toEqual([]);

    // Adding the defaults is what the message asks for; it equips the skill.
    await addModelsToAgent(request, bare.id, [stub.textId]);
    expect(
      (await getSkillModels(request, created.id)).map((model) => model.id),
    ).toEqual([stub.textId]);
    const arms = await getArms(request, created.id);
    expect(arms.length).toBeGreaterThan(0);
    for (const arm of arms) {
      expect(arm.params.system_prompt).toBe(prompt);
    }

    // Its evaluations arrive in the background -- generated at creation, or
    // by the adoption above if creation could not. They are what optimization
    // scores with, so a fully ready skill has some.
    await expect
      .poll(async () => (await getSkillEvaluations(request, created.id)).length)
      .toBeGreaterThan(0);

    const served = await plainChat('another bouquet');
    expect(served.status()).toBe(200);
    expect(await getSkills(request, { agent_id: bare.id })).toHaveLength(1);
  });

  test('creates one skill for concurrent first requests', async ({
    request,
  }) => {
    const fresh = await createAgent(request, uniqueAgentName('create-race'));
    await addModelsToAgent(request, fresh.id, [stub.textId]);
    const prompt = 'You are a travel agent. vec(0,0,0,1,0,0,0,0)';
    const guests = ['one', 'two', 'three', 'four', 'five'];

    const responses = await Promise.all(
      guests.map((guest) =>
        chatToAgent(
          request,
          fresh.name,
          stub.textModel,
          prompt,
          `a trip for ${guest}`,
        ),
      ),
    );

    for (const response of responses) {
      expect(response.status()).toBe(200);
    }
    const skills = await getSkills(request, { agent_id: fresh.id });
    expect(skills).toHaveLength(1);
    // One request created the skill; the rest waited for it and were routed
    // to it, as its centroid is their very intent.
    await expect
      .poll(async () => {
        const decisions = await Promise.all(
          guests.map((guest) =>
            decisionFor(request, skills[0].id, `a trip for ${guest}`),
          ),
        );
        return decisions.sort();
      })
      .toEqual(['created', 'embedding', 'embedding', 'embedding', 'embedding']);
  });
});
