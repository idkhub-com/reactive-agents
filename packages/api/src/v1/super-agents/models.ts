import { handleGenerateArms } from '@api/optimization/skill-optimizations';
import type { AppEnv } from '@api/types/hono';
import { parseDatabaseError } from '@api/utils/database-error';
import { emitSSEEvent } from '@api/utils/sse-event-manager';
import { zValidator } from '@hono/zod-validator';
import {
  ModelCreateParams,
  ModelQueryParams,
  ModelUpdateParams,
} from '@shared/types/data/model';
import { SkillEventType } from '@shared/types/data/skill-event';
import { Hono } from 'hono';
import { z } from 'zod';

/**
 * The system settings that hold a model, labelled as the dashboard labels
 * them. Both backends declare these columns `ON DELETE RESTRICT`, so a model
 * sitting in one of them cannot be deleted -- and the database says so with a
 * bare "FOREIGN KEY constraint failed", which names neither the setting nor
 * the model. Checking up front also keeps a refused delete from having already
 * detached the model from every skill that used it.
 */
const SYSTEM_SETTINGS_MODEL_SLOTS = [
  ['system_prompt_reflection_model_id', 'System Prompt Reflection'],
  ['evaluation_generation_model_id', 'Evaluation Generation'],
  ['embedding_model_id', 'Embedding'],
  ['judge_model_id', 'Judge'],
] as const;

/** "A", "A and B", "A, B and C". */
function formatList(items: string[]): string {
  if (items.length < 2) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const modelsRouter = new Hono<AppEnv>()
  // GET /v1/super-agents/models
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

      const models = await userDataStorageConnector.getModels(c, queryParams);
      return c.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })

  // GET /v1/super-agents/models/:id
  .get('/:id', zValidator('param', z.object({ id: z.uuid() })), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const { id } = c.req.valid('param');

      const models = await userDataStorageConnector.getModels(c, {
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

  // POST /v1/super-agents/models
  .post('/', zValidator('json', ModelCreateParams), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const modelData = c.req.valid('json');

      const newModel = await userDataStorageConnector.createModel(c, modelData);
      return c.json(newModel, 201);
    } catch (error) {
      console.error('Error creating model:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })

  // PATCH /v1/super-agents/models/:id
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
          c,
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

  // DELETE /v1/super-agents/models/:id
  .delete(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');

        // Before anything below detaches the model from its skills, since none
        // of that is rolled back when the delete itself is refused.
        const systemSettings =
          await userDataStorageConnector.getSystemSettings(c);
        const settingsUsingModel = SYSTEM_SETTINGS_MODEL_SLOTS.filter(
          ([column]) => systemSettings?.[column] === id,
        ).map(([, label]) => label);

        if (settingsUsingModel.length > 0) {
          return c.json(
            {
              error: `Cannot delete this model because System Settings uses it as the ${formatList(
                settingsUsingModel,
              )} model. Choose a different one in System Settings first.`,
            },
            409,
          );
        }

        // Find all skills using this model
        const affectedSkills =
          await userDataStorageConnector.getSkillsByModelId(c, id);

        // For each affected skill, remove the model and create an event
        for (const skill of affectedSkills) {
          // Remove the model from the skill
          await userDataStorageConnector.removeModelsFromSkill(c, skill.id, [
            id,
          ]);

          // Create MODEL_REMOVED event
          await userDataStorageConnector.createSkillEvent(c, {
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
            c,
            skill.id,
          );

          // If skill still has models, regenerate arms to use remaining models
          if (remainingModels.length > 0) {
            await handleGenerateArms(c, userDataStorageConnector, skill.id);
          }
        }

        // Delete the model
        await userDataStorageConnector.deleteModel(c, id);

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
