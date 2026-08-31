import {
  getAuthStatus,
  ServerUnavailableError,
} from '@web/api/v1/super-agents/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('getAuthStatus', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('returns the status the server reports', async () => {
    respond(200, { authRequired: false, authenticated: true });

    await expect(getAuthStatus()).resolves.toEqual({
      authRequired: false,
      authenticated: true,
    });
  });

  it('returns null when the server cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(getAuthStatus()).resolves.toBeNull();
  });

  it('returns null for an answer that is not a status', async () => {
    respond(500, 'Internal Server Error');

    await expect(getAuthStatus()).resolves.toBeNull();
  });

  it('throws the reason when the server is up but unavailable', async () => {
    respond(503, {
      error: 'libSQL migration 0001 does not match this database',
    });

    const error = await getAuthStatus().catch((e) => e);

    expect(error).toBeInstanceOf(ServerUnavailableError);
    expect(error.message).toBe(
      'libSQL migration 0001 does not match this database',
    );
  });

  it('treats a 503 without a reason like any other failure', async () => {
    respond(503, 'Service Unavailable');

    await expect(getAuthStatus()).resolves.toBeNull();
  });
});
