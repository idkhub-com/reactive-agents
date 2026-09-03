import type { AppEnv } from '@api/types/hono';
import { emitSSEEvent, sseEventManager } from '@api/utils/sse-event-manager';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeKey = vi.hoisted(() => ({ value: 'node' as string }));

vi.mock('hono/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('hono/adapter')>();
  return {
    ...actual,
    getRuntimeKey: () => runtimeKey.value,
  };
});

const { eventsRouter } = await import('@api/v1/super-agents/events');

/**
 * Reads SSE frames off a response body until `count` of them have arrived.
 *
 * The stream is held open deliberately, so a test can never read it to
 * completion -- it reads exactly what it expects and then cancels.
 */
async function readFrames(
  body: ReadableStream<Uint8Array>,
  count: number,
): Promise<Record<string, unknown>[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const frames: Record<string, unknown>[] = [];
  let buffer = '';

  try {
    while (frames.length < count) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      for (const line of buffer.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          frames.push(JSON.parse(trimmed.slice('data:'.length).trim()));
        }
      }
      buffer = '';
    }
  } finally {
    await reader.cancel().catch(() => {
      // Already gone -- the assertion is about what was read, not the close.
    });
  }

  return frames;
}

describe('SSE Events Endpoint', () => {
  const app = new Hono<AppEnv>().route('/events', eventsRouter);

  beforeEach(() => {
    runtimeKey.value = 'node';
    // The manager is a singleton; other suites in the same file share it.
    for (const id of sseEventManager.getUserClients('default')) {
      sseEventManager.removeClient(id);
    }
  });

  afterEach(() => {
    sseEventManager.stopPingInterval();
  });

  describe('on a runtime that can hold a stream open', () => {
    it('answers with an event stream', async () => {
      const response = await app.fetch(new Request('http://localhost/events'));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'text/event-stream',
      );

      await response.body?.cancel();
    });

    it('sends an opening frame so the client knows the stream is live', async () => {
      const response = await app.fetch(new Request('http://localhost/events'));
      const [frame] = await readFrames(
        response.body as ReadableStream<Uint8Array>,
        1,
      );

      expect(frame?.type).toBe('ping');
    });

    it('registers the connection so emitted events reach it', async () => {
      const response = await app.fetch(new Request('http://localhost/events'));
      const body = response.body as ReadableStream<Uint8Array>;

      // Read the opening frame first: the client is registered by then.
      const reader = body.getReader();
      await reader.read();
      reader.releaseLock();

      expect(sseEventManager.getClientCount()).toBe(1);

      emitSSEEvent('skill:created', { resourceId: 'skill-1' });

      const [frame] = await readFrames(body, 1);
      expect(frame?.type).toBe('skill:created');
      expect(frame?.data).toEqual({ resourceId: 'skill-1' });
    });

    it('drops the client when the connection goes away', async () => {
      const response = await app.fetch(new Request('http://localhost/events'));

      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();

      expect(sseEventManager.getClientCount()).toBe(1);

      // What a browser navigating away amounts to: the response body is
      // cancelled, which Hono turns into an abort on the stream. It has to be
      // this and not a failed write -- `StreamingApi.write` swallows its
      // errors, so a dead connection is never noticed by writing to it.
      await reader.cancel();

      // Give the abort listener a turn.
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sseEventManager.getClientCount()).toBe(0);
    });
  });

  describe('on a runtime that cannot', () => {
    it('answers 501 so the dashboard polls instead', async () => {
      runtimeKey.value = 'workerd';

      const response = await app.fetch(new Request('http://localhost/events'));

      expect(response.status).toBe(501);
      expect(await response.json()).toMatchObject({
        code: 'SSE_NOT_SUPPORTED',
      });
      expect(sseEventManager.getClientCount()).toBe(0);
    });
  });
});
