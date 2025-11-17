import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { SkillEventQueryParams } from '@shared/types/data/skill-event';
import { Hono } from 'hono';

export const skillEventsRouter = new Hono<AppEnv>().get(
  '/',
  zValidator('query', SkillEventQueryParams),
  async (c) => {
    try {
      const queryParams = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const events = await connector.getSkillEvents(queryParams);

      return c.json(events);
    } catch (error) {
      console.error('Error fetching skill events:', error);
      return c.json({ error: 'Failed to fetch skill events' }, 500);
    }
  },
);
