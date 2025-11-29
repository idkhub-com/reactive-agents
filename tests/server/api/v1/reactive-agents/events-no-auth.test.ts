import { eventsRouter } from '@server/api/v1/reactive-agents/events';
import { authenticatedMiddleware } from '@server/middlewares/auth';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { describe, expect, it, vi } from 'vitest';

// Mock the constants module with BEARER_TOKEN as undefined (no auth required)
vi.mock('@server/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@server/constants')>();
  return {
    ...actual,
    BEARER_TOKEN: undefined,
  };
});

/**
 * Tests for SSE Events Endpoint when BEARER_TOKEN is NOT configured
 *
 * When BEARER_TOKEN is undefined, API requests without authentication
 * should be allowed through (no auth required by default).
 */
describe('SSE Events Endpoint - No Authentication Required', () => {
  const factory = createFactory<AppEnv>();

  it('should allow requests without authentication when BEARER_TOKEN is not configured', async () => {
    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .route('/events', eventsRouter);

    // Request without any authentication
    const req = new Request('http://localhost/events/');
    const response = await app.fetch(req);

    // Should NOT be 401 - request should be allowed through
    expect(response.status).not.toBe(401);
  });

  it('should allow requests with arbitrary bearer token when BEARER_TOKEN is not configured', async () => {
    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .route('/events', eventsRouter);

    // Request with a random bearer token - should be allowed since no token is required
    const req = new Request('http://localhost/events/', {
      headers: {
        Authorization: 'Bearer some-random-token',
      },
    });

    const response = await app.fetch(req);

    // Should NOT be 401 - request should be allowed through
    expect(response.status).not.toBe(401);
  });
});
