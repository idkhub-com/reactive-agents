import { expect, test } from '@playwright/test';
import { createAgent, uniqueAgentName } from '../fixtures/agents';
import {
  CHAT_COMPLETIONS_PATH,
  chatBody,
  saConfig,
  stubReset,
  uniqueModelName,
} from '../fixtures/gateway';
import { createSkill } from '../fixtures/skills';

/**
 * Requests announced on the event stream while they are still running.
 *
 * A log row is only written once a request has finished, so until these
 * events existed the dashboard had nothing at all to show for a request in
 * progress -- a slow one was indistinguishable from no request. The whole
 * path only exists in the built server: the events endpoint holds a stream
 * open, the gateway middleware announces the request as it resolves the
 * skill, and settles it when the response completes. Nothing under `pnpm
 * test` exercises the three together.
 *
 * Here rather than in `contract/` because none of it touches storage: the
 * registry is in memory, and the agent and skill exist only because the
 * gateway resolves them before calling a provider.
 */

interface Frame {
  type: string;
  data?: Record<string, unknown>;
}

/**
 * Reads the event stream into an array as frames arrive.
 *
 * The stream never ends on its own, so the reader is pulled on its own
 * promise and the test asserts against what has landed so far.
 */
const openEventStream = async (baseURL: string) => {
  const controller = new AbortController();
  const response = await fetch(`${baseURL}/v1/super-agents/events`, {
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  });

  expect(response.status).toBe(200);

  const frames: Frame[] = [];
  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();

  const pump = (async () => {
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Frames are separated by a blank line; keep any partial tail.
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data:')) {
              frames.push(JSON.parse(line.slice('data:'.length).trim()));
            }
          }
        }
      }
    } catch {
      // Aborted by the test; nothing to report.
    }
  })();

  return {
    frames,
    close: async () => {
      controller.abort();
      await reader.cancel().catch(() => {
        // Already torn down by the abort above.
      });
      await pump;
    },
  };
};

test.describe('in-flight requests', () => {
  test('announces a gateway request as it starts and again when it finishes', async ({
    request,
    baseURL,
  }) => {
    const agent = await createAgent(request, uniqueAgentName('inflight'));
    await createSkill(request, agent.id, 'inflight_skill');
    const model = uniqueModelName('inflight');

    const stream = await openEventStream(baseURL as string);

    try {
      const response = await request.post(CHAT_COMPLETIONS_PATH, {
        headers: {
          'sa-config': saConfig(agent.name, 'inflight_skill', { model }),
        },
        data: chatBody('is anyone there'),
      });
      expect(response.status()).toBe(200);

      // The stream carries every request the server is handling, and the
      // suite runs fully parallel, so this agent's own traffic has to be
      // picked out of it -- the same way the gateway specs separate theirs.
      const ours = () =>
        stream.frames.find(
          (f) =>
            f.type === 'log:request-started' && f.data?.agent_id === agent.id,
        );

      await expect
        .poll(() => ours() !== undefined, {
          timeout: 15_000,
          message: 'no log:request-started frame arrived for this agent',
        })
        .toBe(true);

      const started = ours();
      expect(started?.data).toMatchObject({
        agent_id: agent.id,
        method: 'POST',
        endpoint: CHAT_COMPLETIONS_PATH,
      });
      // Enough to place the row in the right skill's logs.
      expect(typeof started?.data?.skill_id).toBe('string');
      expect(typeof started?.data?.request_id).toBe('string');

      // And it has to end, or the dashboard would count up forever.
      await expect
        .poll(
          () =>
            stream.frames.some(
              (f) =>
                f.type === 'log:request-settled' &&
                f.data?.request_id === started?.data?.request_id,
            ),
          { timeout: 15_000, message: 'the request was never settled' },
        )
        .toBe(true);
    } finally {
      await stream.close();
      await stubReset(request, model);
    }
  });

  test('does not replay a request that has already finished', async ({
    request,
    baseURL,
  }) => {
    // The endpoint catches a connecting client up on what is still running,
    // which is what makes a reload mid-request work. The other half of that
    // has to hold too: a request that has finished is gone from the registry,
    // so a dashboard opening afterwards must not be handed a pending row that
    // would then tick forever with nothing left to settle it. (The replay
    // itself is asserted in `events.test.ts`, where a request can be held in
    // flight without a provider that can be told to wait.)
    const agent = await createAgent(request, uniqueAgentName('replay'));
    await createSkill(request, agent.id, 'replay_skill');
    const model = uniqueModelName('replay');

    try {
      const response = await request.post(CHAT_COMPLETIONS_PATH, {
        headers: {
          'sa-config': saConfig(agent.name, 'replay_skill', { model }),
        },
        data: chatBody('already finished'),
      });
      expect(response.status()).toBe(200);

      const stream = await openEventStream(baseURL as string);
      try {
        // Give the opening frames time to arrive.
        await expect
          .poll(() => stream.frames.some((f) => f.type === 'ping'), {
            timeout: 10_000,
          })
          .toBe(true);

        expect(
          stream.frames.filter(
            (f) =>
              f.type === 'log:request-started' && f.data?.agent_id === agent.id,
          ),
        ).toHaveLength(0);
      } finally {
        await stream.close();
      }
    } finally {
      await stubReset(request, model);
    }
  });
});
