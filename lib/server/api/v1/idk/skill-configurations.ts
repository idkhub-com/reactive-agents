import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  SkillConfigurationCreateParams,
  SkillConfigurationQueryParams,
  SkillConfigurationUpdateParams,
} from '@shared/types/data/skill-configuration';
import { Hono } from 'hono';
import { z } from 'zod';

export const skillConfigurationsRouter = new Hono<AppEnv>()
  .post('/', zValidator('json', SkillConfigurationCreateParams), async (c) => {
    try {
      const data = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      const newSkillConfiguration =
        await connector.createSkillConfiguration(data);

      return c.json(newSkillConfiguration, 201);
    } catch (error) {
      console.error('Error creating skill configuration:', error);
      return c.json({ error: 'Failed to create skill configuration' }, 500);
    }
  })
  .get('/', zValidator('query', SkillConfigurationQueryParams), async (c) => {
    try {
      const query = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const skillConfigurations = await connector.getSkillConfigurations(query);

      return c.json(skillConfigurations, 200);
    } catch (error) {
      console.error('Error fetching skill configurations:', error);
      return c.json({ error: 'Failed to fetch skill configurations' }, 500);
    }
  })
  .patch(
    '/:skillConfigurationId',
    zValidator('param', z.object({ skillConfigurationId: z.uuid() })),
    zValidator('json', SkillConfigurationUpdateParams),
    async (c) => {
      try {
        const { skillConfigurationId } = c.req.valid('param');
        const data = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const updatedSkillConfiguration =
          await connector.updateSkillConfiguration(skillConfigurationId, data);

        return c.json(updatedSkillConfiguration, 200);
      } catch (error) {
        console.error('Error updating skill configuration:', error);
        return c.json({ error: 'Failed to update skill configuration' }, 500);
      }
    },
  )
  .delete(
    '/:skillConfigurationId',
    zValidator('param', z.object({ skillConfigurationId: z.uuid() })),
    async (c) => {
      try {
        const { skillConfigurationId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteSkillConfiguration(skillConfigurationId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting skill configuration:', error);
        return c.json({ error: 'Failed to delete skill configuration' }, 500);
      }
    },
  );
