import { zValidator } from '@hono/zod-validator';
import { handleGenerateArms } from '@server/optimization/skill-optimizations';
import type { AppEnv } from '@server/types/hono';
import { parseDatabaseError } from '@server/utils/database-error';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import {
  ModelCreateParams,
  ModelQueryParams,
  ModelUpdateParams,
} from '@shared/types/data/model';
import { SkillEventType } from '@shared/types/data/skill-event';
import { Hono } from 'hono';
import { z } from 'zod';

export const modelsRouter = new Hono<AppEnv>()
  // GET /v1/reactive-agents/models
  .get('/', async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');

      const queryParams = ModelQueryParams.parse({
        id: c.req.query('id'),
        ai_provider_id: c.req.query('ai_provider_id'),
        model_name: c.req.query('model_name'),
        limit: c.req.query('limit'),
        offset: c.req.query('offset'),
      });

      const models = await userDataStorageConnector.getModels(queryParams);
      return c.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })

  // GET /v1/reactive-agents/models/:id
  .get('/:id', zValidator('param', z.object({ id: z.uuid() })), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const { id } = c.req.valid('param');

      const models = await userDataStorageConnector.getModels({
        id,
      });
      if (!models || models.length === 0) {
        return c.json({ error: 'Model not found' }, 404);
      }

      const model = models[0];

      return c.json(model);
    } catch (error) {
      console.error('Error fetching model:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })

  // POST /v1/reactive-agents/models
  .post('/', zValidator('json', ModelCreateParams), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const modelData = c.req.valid('json');

      const newModel = await userDataStorageConnector.createModel(modelData);
      return c.json(newModel, 201);
    } catch (error) {
      console.error('Error creating model:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })

  // PATCH /v1/reactive-agents/models/:id
  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', ModelUpdateParams),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');
        const updateData = c.req.valid('json');

        const updatedModel = await userDataStorageConnector.updateModel(
          id,
          updateData,
        );
        return c.json(updatedModel);
      } catch (error) {
        console.error('Error updating model:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  )

  // DELETE /v1/reactive-agents/models/:id
  .delete(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');

        // Find all skills using this model
        const affectedSkills =
          await userDataStorageConnector.getSkillsByModelId(id);

        // For each affected skill, remove the model and create an event
        for (const skill of affectedSkills) {
          // Remove the model from the skill
          await userDataStorageConnector.removeModelsFromSkill(skill.id, [id]);

          // Create MODEL_REMOVED event
          await userDataStorageConnector.createSkillEvent({
            agent_id: skill.agent_id,
            skill_id: skill.id,
            cluster_id: null,
            event_type: SkillEventType.MODEL_REMOVED,
            metadata: {
              model_id: id,
            },
          });

          // Emit SSE event for skill update (models changed)
          emitSSEEvent('skill:updated', {
            skillId: skill.id,
            agentId: skill.agent_id,
            reason: 'model_removed',
          });

          // Check if skill still has models
          const remainingModels = await userDataStorageConnector.getSkillModels(
            skill.id,
          );

          // If skill still has models, regenerate arms to use remaining models
          if (remainingModels.length > 0) {
            await handleGenerateArms(c, userDataStorageConnector, skill.id);
          }
        }

        // Delete the model
        await userDataStorageConnector.deleteModel(id);

        // Emit SSE event for model deletion
        emitSSEEvent('model:deleted', {
          modelId: id,
        });

        return c.json({ success: true });
      } catch (error) {
        console.error('Error deleting model:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  );
