import { expect, test } from '@playwright/test';
import {
  CHAT_COMPLETIONS_PATH,
  chatBody,
  stubRequests,
} from '../fixtures/gateway';
import {
  getArms,
  getClusters,
  type OptimizedSkill,
  optimizedConfig,
  STUB_SYSTEM_PROMPT,
  setUpOptimizedSkill,
} from '../fixtures/optimizer';

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
