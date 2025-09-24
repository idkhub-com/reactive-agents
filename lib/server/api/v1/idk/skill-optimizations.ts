import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { SkillOptimizationQueryParams } from '@shared/types/data/skill-optimization';
import { Hono } from 'hono';
import { z } from 'zod';

export const skillOptimizationsRouter = new Hono<AppEnv>()

  .get('/', zValidator('query', SkillOptimizationQueryParams), async (c) => {
    try {
      const query = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const skillConfigurations = await connector.getSkillOptimizations(query);

      return c.json(skillConfigurations, 200);
    } catch (error) {
      console.error('Error fetching skill configurations:', error);
      return c.json({ error: 'Failed to fetch skill configurations' }, 500);
    }
  })
  .delete(
    '/:skillOptimizationId',
    zValidator('param', z.object({ skillOptimizationId: z.uuid() })),
    async (c) => {
      try {
        const { skillOptimizationId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteSkillOptimization(skillOptimizationId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting skill configuration:', error);
        return c.json({ error: 'Failed to delete skill configuration' }, 500);
      }
    },
  );
