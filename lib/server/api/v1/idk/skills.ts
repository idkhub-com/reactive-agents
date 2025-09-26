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
    zValidator('param', z.object({ skillId: z.uuid() })),
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
    zValidator('param', z.object({ skillId: z.uuid() })),
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
  )
  .get(
    '/:skillId/models',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const models = await connector.getModelsBySkillId(skillId);

        return c.json(models);
      } catch (error) {
        console.error('Error fetching models for skill:', error);
        return c.json({ error: 'Failed to fetch models for skill' }, 500);
      }
    },
  )
  .post(
    '/:skillId/models',
    zValidator('param', z.object({ skillId: z.uuid() })),
    zValidator('json', z.object({ modelIds: z.array(z.uuid()) })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const { modelIds } = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        await connector.addModelsToSkill(skillId, modelIds);

        return c.json({ success: true }, 201);
      } catch (error) {
        console.error('Error adding models to skill:', error);
        return c.json({ error: 'Failed to add models to skill' }, 500);
      }
    },
  )
  .delete(
    '/:skillId/models',
    zValidator('param', z.object({ skillId: z.uuid() })),
    zValidator('json', z.object({ modelIds: z.array(z.uuid()) })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const { modelIds } = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        await connector.removeModelsFromSkill(skillId, modelIds);

        return c.json({ success: true });
      } catch (error) {
        console.error('Error removing models from skill:', error);
        return c.json({ error: 'Failed to remove models from skill' }, 500);
      }
    },
  )
  .post(
    '/:skillId/generate-arms',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const skillConfiguration =
          await connector.createSkillOptimization(skillId);

        return c.json(skillConfiguration, 201);
      } catch (error) {
        console.error('Error creating skill configuration:', error);
        return c.json({ error: 'Failed to create skill configuration' }, 500);
      }
    },
  );
