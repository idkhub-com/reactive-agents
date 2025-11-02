import { eventsRouter } from '@server/api/v1/reactive-agents/events';
import { BEARER_TOKEN, JWT_SECRET } from '@server/constants';
import { authenticatedMiddleware } from '@server/middlewares/auth';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { sign } from 'hono/jwt';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Integration Tests for SSE Events Endpoint with Authentication Middleware
 *
 * These tests verify the complete authentication flow including the
 * authenticatedMiddleware that protects the SSE endpoint in production.
 */
describe('SSE Events Endpoint - Full Authentication Integration', () => {
  const factory = createFactory<AppEnv>();

  beforeEach(() => {
    // Clear any test state
  });

  it('should reject requests without any authentication', async () => {
    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .route('/events', eventsRouter);

    const req = new Request('http://localhost/events/');
    const response = await app.fetch(req);

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toBe('Unauthorized');
  });

  it('should reject requests with invalid bearer token', async () => {
    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .route('/events', eventsRouter);

    const req = new Request('http://localhost/events/', {
      headers: {
        Authorization: 'Bearer invalid-token-12345',
      },
    });

    const response = await app.fetch(req);

    expect(response.status).toBe(401);
  });

  it('should accept requests with valid bearer token', async () => {
    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .route('/events', eventsRouter);

    // Create a raw request with the bearer token
    const req = new Request('http://localhost/events/', {
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
      },
    });

    const response = await app.fetch(req);

    // Should NOT be 401 - streaming responses may have different status codes
    expect(response.status).not.toBe(401);
  });

  it('should accept requests with valid JWT cookie', async () => {
    // Generate a valid JWT token
    const token = await sign(
      { sub: 'test-user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      JWT_SECRET,
    );

    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .route('/events', eventsRouter);

    // Create request with cookie header
    const req = new Request('http://localhost/events/', {
      headers: {
        Cookie: `access_token=${token}`,
      },
    });

    const response = await app.fetch(req);

    // Should NOT be 401 if authentication succeeded
    expect(response.status).not.toBe(401);
  });

  it('should set jwtPayload context variable for JWT authentication', async () => {
    const testUserId = 'user-789';
    const token = await sign(
      { sub: testUserId, exp: Math.floor(Date.now() / 1000) + 3600 },
      JWT_SECRET,
    );

    // biome-ignore lint/suspicious/noExplicitAny: Testing runtime values from context
    let capturedJwtPayload: any = null;

    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .use('*', async (c, next) => {
        // Capture the jwtPayload set by auth middleware
        capturedJwtPayload = c.get('jwtPayload');
        await next();
      })
      .route('/events', eventsRouter);

    // Create request with JWT cookie
    const req = new Request('http://localhost/events/', {
      headers: {
        Cookie: `access_token=${token}`,
      },
    });

    await app.fetch(req);

    // Verify jwtPayload was set with correct user ID
    expect(capturedJwtPayload).not.toBeNull();
    expect(capturedJwtPayload?.sub).toBe(testUserId);
  });

  it('should NOT set jwtPayload for bearer token authentication', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Testing runtime values from context
    let capturedJwtPayload: any;

    const app = new Hono<AppEnv>()
      .use('*', authenticatedMiddleware(factory))
      .use('*', async (c, next) => {
        // Capture the jwtPayload (should be undefined for bearer token)
        capturedJwtPayload = c.get('jwtPayload');
        await next();
      })
      .route('/events', eventsRouter);

    // Create request with bearer token
    const req = new Request('http://localhost/events/', {
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
      },
    });

    await app.fetch(req);

    // Bearer token auth should NOT set jwtPayload
    expect(capturedJwtPayload).toBeUndefined();
  });
});

/**
 * Security Test Documentation
 *
 * These tests verify that:
 *
 * 1. Unauthenticated requests are rejected with 401
 * 2. Invalid bearer tokens are rejected with 401
 * 3. Valid bearer tokens are accepted
 * 4. Valid JWT tokens are accepted
 * 5. JWT tokens properly set the jwtPayload context variable
 * 6. Bearer tokens do NOT set jwtPayload (using "default" userId instead)
 *
 * This ensures the SSE endpoint has proper authentication and authorization
 * before allowing clients to establish real-time connections.
 */
