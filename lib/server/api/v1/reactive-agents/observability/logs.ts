import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { type Log, LogsQueryParams } from '@shared/types/data/log';
import { Hono } from 'hono';

const app = new Hono<AppEnv>().get(
  '/',
  zValidator('query', LogsQueryParams, (result, c) => {
    if (!result.success) {
      console.error('Query validation failed:', result.error.issues);
      return c.json(
        { error: 'Invalid query parameters', details: result.error.issues },
        400,
      );
    }
  }),
  async (c) => {
    try {
      const params = c.req.valid('query');
      let logs: Log[] = [];
      try {
        logs = await c.get('logs_storage_connector').getLogs(params);
      } catch (error) {
        console.error('Error from storage connector:', error);
        // Return empty array on storage errors, not an object
        logs = [];
      }
      return c.json(logs);
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return c.json({ error: 'Failed to retrieve logs' }, 500);
    }
  },
);

export default app;
