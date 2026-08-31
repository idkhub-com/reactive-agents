import { ensureStorageReady } from '@api/connectors';
import { StaleMigrationError } from '@api/connectors/libsql/migrate';
import { userDataMiddleware } from '@api/middlewares/user-data';
import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@api/connectors', () => ({ ensureStorageReady: vi.fn() }));
vi.mock('@shared/console-logging', () => ({ error: vi.fn() }));

describe('userDataMiddleware', () => {
  const connector = {
    getAgents: vi.fn(),
  } as unknown as UserDataStorageConnector;
  const app = new Hono<AppEnv>()
    .use(
      '*',
      userDataMiddleware(createFactory<AppEnv>(), () => connector),
    )
    .get('/', (c) =>
      c.json({
        hasConnector: c.get('user_data_storage_connector') === connector,
      }),
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the connector once storage is ready', async () => {
    vi.mocked(ensureStorageReady).mockResolvedValue(undefined);

    const res = await app.request('/');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hasConnector: true });
  });

  it('answers 503 with the message when the database is stale', async () => {
    vi.mocked(ensureStorageReady).mockRejectedValue(
      new StaleMigrationError('0001_initial_schema', null),
    );

    const res = await app.request('/');

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('0001_initial_schema');
    expect(body.error).toContain('.local-data/dev.db');
  });

  it('lets other storage failures propagate', async () => {
    vi.mocked(ensureStorageReady).mockRejectedValue(new Error('disk full'));

    const res = await app.request('/');

    expect(res.status).toBe(500);
  });
});
