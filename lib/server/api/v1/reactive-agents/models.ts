import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  ModelCreateParams,
  ModelQueryParams,
  ModelUpdateParams,
} from '@shared/types/data/model';
import { Hono } from 'hono';
import { z } from 'zod';

export const modelsRouter = new Hono<AppEnv>()
  // GET /v1/reactive-agents/models
  .get('/', async (c) => {
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
  })

  // GET /v1/reactive-agents/models/:id
  .get('/:id', zValidator('param', z.object({ id: z.uuid() })), async (c) => {
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
  })

  // POST /v1/reactive-agents/models
  .post('/', zValidator('json', ModelCreateParams), async (c) => {
    const userDataStorageConnector = c.get('user_data_storage_connector');
    const modelData = c.req.valid('json');

    const newModel = await userDataStorageConnector.createModel(modelData);
    return c.json(newModel, 201);
  })

  // PATCH /v1/reactive-agents/models/:id
  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', ModelUpdateParams),
    async (c) => {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const { id } = c.req.valid('param');
      const updateData = c.req.valid('json');

      const updatedModel = await userDataStorageConnector.updateModel(
        id,
        updateData,
      );
      return c.json(updatedModel);
    },
  )

  // DELETE /v1/reactive-agents/models/:id
  .delete(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    async (c) => {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const { id } = c.req.valid('param');

      await userDataStorageConnector.deleteModel(id);
      return c.json({ success: true });
    },
  );
