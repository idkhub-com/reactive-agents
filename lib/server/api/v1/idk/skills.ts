import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data/skill';
import { Hono } from 'hono';
import { z } from 'zod';

export const skillsRouter = new Hono<AppEnv>()
  .post('/', zValidator('json', SkillCreateParams), async (c) => {
    try {
      const data = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      const newSkill = await connector.createSkill(data);

      return c.json(newSkill, 201);
    } catch (error) {
      console.error('Error creating skill:', error);
      return c.json({ error: 'Failed to create skill' }, 500);
    }
  })
  .get('/', zValidator('query', SkillQueryParams), async (c) => {
    try {
      const query = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const skills = await connector.getSkills(query);

      return c.json(skills, 200);
    } catch (error) {
      console.error('Error fetching skills:', error);
      return c.json({ error: 'Failed to fetch skills' }, 500);
    }
  })
  .patch(
    '/:skillId',
    zValidator('param', z.object({ skillId: z.string().uuid() })),
    zValidator('json', SkillUpdateParams),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const data = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const updatedSkill = await connector.updateSkill(skillId, data);

        return c.json(updatedSkill, 200);
      } catch (error) {
        console.error('Error updating skill:', error);
        return c.json({ error: 'Failed to update skill' }, 500);
      }
    },
  )
  .delete(
    '/:skillId',
    zValidator('param', z.object({ skillId: z.string().uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteSkill(skillId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting skill:', error);
        return c.json({ error: 'Failed to delete skill' }, 500);
      }
    },
  );
