import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { SystemSettingsUpdateParams } from '@shared/types/data/system-settings';
import { Hono } from 'hono';

export const systemSettingsRouter = new Hono<AppEnv>()
  // GET /v1/reactive-agents/system-settings
  .get('/', async (c) => {
    const userDataStorageConnector = c.get('user_data_storage_connector');

    const settings = await userDataStorageConnector.getSystemSettings();
    return c.json(settings);
  })

  // PATCH /v1/reactive-agents/system-settings
  .patch('/', zValidator('json', SystemSettingsUpdateParams), async (c) => {
    const userDataStorageConnector = c.get('user_data_storage_connector');
    const updateData = c.req.valid('json');

    const updatedSettings =
      await userDataStorageConnector.updateSystemSettings(updateData);
    return c.json(updatedSettings);
  });
