import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  AIProviderAPIKeyCreateParams,
  AIProviderAPIKeyQueryParams,
  AIProviderAPIKeyUpdateParams,
} from '@shared/types/data/ai-provider-api-key';
import { Hono } from 'hono';
import { z } from 'zod';

export const aiProviderAPIKeysRouter = new Hono<AppEnv>()

  // GET /v1/idk/ai-provider-api-keys - List all API keys
  .get('/', zValidator('query', AIProviderAPIKeyQueryParams), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const queryParams = c.req.valid('query');

      const apiKeys =
        await userDataStorageConnector.getAIProviderAPIKeys(queryParams);

      return c.json(apiKeys);
    } catch (error) {
      console.error('Error fetching AI provider API keys:', error);
      return c.json({ error: 'Failed to fetch API keys' }, 500);
    }
  })

  // POST /v1/idk/ai-provider-api-keys - Create new API key
  .post('/', zValidator('json', AIProviderAPIKeyCreateParams), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const apiKeyData = c.req.valid('json');

      const createdAPIKey =
        await userDataStorageConnector.createAIProviderAPIKey(apiKeyData);

      return c.json(createdAPIKey, 201);
    } catch (error) {
      console.error('Error creating AI provider API key:', error);
      return c.json({ error: 'Failed to create API key' }, 500);
    }
  })

  // PATCH /v1/idk/ai-provider-api-keys/:id - Update API key
  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.string() })),
    zValidator('json', AIProviderAPIKeyUpdateParams),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');
        const updateData = c.req.valid('json');

        const updatedAPIKey =
          await userDataStorageConnector.updateAIProviderAPIKey(id, updateData);

        return c.json(updatedAPIKey);
      } catch (error) {
        console.error('Error updating AI provider API key:', error);
        return c.json({ error: 'Failed to update API key' }, 500);
      }
    },
  )

  // DELETE /v1/idk/ai-provider-api-keys/:id - Delete API key
  .delete(
    '/:id',
    zValidator('param', z.object({ id: z.string() })),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');

        await userDataStorageConnector.deleteAIProviderAPIKey(id);

        return c.json({ success: true }, 200);
      } catch (error) {
        console.error('Error deleting AI provider API key:', error);
        return c.json({ error: 'Failed to delete API key' }, 500);
      }
    },
  );
