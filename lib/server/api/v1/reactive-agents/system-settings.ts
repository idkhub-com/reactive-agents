import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { parseDatabaseError } from '@server/utils/database-error';
import { SystemSettingsUpdateParams } from '@shared/types/data/system-settings';
import { Hono } from 'hono';

export const systemSettingsRouter = new Hono<AppEnv>()
  // GET /v1/reactive-agents/system-settings
  .get('/', async (c) => {
    try {
      const connector = c.get('user_data_storage_connector');

      const settings = await connector.getSystemSettings();
      return c.json(settings, 200);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })

  // PATCH /v1/reactive-agents/system-settings
  .patch('/', zValidator('json', SystemSettingsUpdateParams), async (c) => {
    try {
      const connector = c.get('user_data_storage_connector');
      const updateData = c.req.valid('json');

      const updatedSettings = await connector.updateSystemSettings(updateData);
      return c.json(updatedSettings, 200);
    } catch (error) {
      console.error('Error updating system settings:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  });
