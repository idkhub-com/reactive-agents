import { zValidator } from '@hono/zod-validator';
import { providerConfigs } from '@server/ai-providers';
import type { AppEnv } from '@server/types/hono';
import {
  AIProviderConfigCreateParams,
  AIProviderConfigQueryParams,
  AIProviderConfigUpdateParams,
} from '@shared/types/data/ai-provider';
import { Hono } from 'hono';
import { z } from 'zod';

export const aiProvidersRouter = new Hono<AppEnv>()

  // GET /v1/reactive-agents/ai-providers/schemas - Get all AI provider custom fields schemas
  .get('/schemas', (c) => {
    const schemas: Record<
      string,
      { hasCustomFields: boolean; schema?: object; isAPIKeyRequired: boolean }
    > = {};

    for (const [provider, config] of Object.entries(providerConfigs)) {
      const isAPIKeyRequired = config?.api.isAPIKeyRequired ?? true;

      if (config?.api.customFieldsSchema) {
        schemas[provider] = {
          hasCustomFields: true,
          schema: z.toJSONSchema(config.api.customFieldsSchema),
          isAPIKeyRequired,
        };
      } else {
        schemas[provider] = {
          hasCustomFields: false,
          isAPIKeyRequired,
        };
      }
    }

    return c.json(schemas);
  })

  // GET /v1/reactive-agents/ai-providers/schemas/:provider - Get specific provider schema
  .get('/schemas/:provider', (c) => {
    const provider = c.req.param('provider');
    const config = providerConfigs[provider as keyof typeof providerConfigs];

    if (!config) {
      return c.json(
        {
          error: `Provider '${provider}' not found or not configured`,
        },
        404,
      );
    }

    const isAPIKeyRequired = config.api.isAPIKeyRequired ?? true;

    if (!config.api.customFieldsSchema) {
      return c.json({
        hasCustomFields: false,
        isAPIKeyRequired,
      });
    }

    return c.json({
      hasCustomFields: true,
      schema: z.toJSONSchema(config.api.customFieldsSchema),
      isAPIKeyRequired,
    });
  })

  // GET /v1/reactive-agents/ai-providers - List all AI providers
  .get('/', zValidator('query', AIProviderConfigQueryParams), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const queryParams = c.req.valid('query');

      const providers =
        await userDataStorageConnector.getAIProviderAPIKeys(queryParams);

      return c.json(providers);
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      return c.json({ error: 'Failed to fetch AI providers' }, 500);
    }
  })

  // POST /v1/reactive-agents/ai-providers - Create new AI provider
  .post('/', zValidator('json', AIProviderConfigCreateParams), async (c) => {
    try {
      const userDataStorageConnector = c.get('user_data_storage_connector');
      const providerData = c.req.valid('json');

      const createdProvider =
        await userDataStorageConnector.createAIProvider(providerData);

      return c.json(createdProvider, 201);
    } catch (error) {
      console.error('Error creating AI provider:', error);
      return c.json({ error: 'Failed to create AI provider' }, 500);
    }
  })

  // PATCH /v1/reactive-agents/ai-providers/:id - Update AI provider
  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.string() })),
    zValidator('json', AIProviderConfigUpdateParams),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');
        const updateData = c.req.valid('json');

        const updatedProvider = await userDataStorageConnector.updateAIProvider(
          id,
          updateData,
        );

        return c.json(updatedProvider);
      } catch (error) {
        console.error('Error updating AI provider:', error);
        return c.json({ error: 'Failed to update AI provider' }, 500);
      }
    },
  )

  // DELETE /v1/reactive-agents/ai-providers/:id - Delete AI provider
  .delete(
    '/:id',
    zValidator('param', z.object({ id: z.string() })),
    async (c) => {
      try {
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const { id } = c.req.valid('param');

        await userDataStorageConnector.deleteAIProvider(id);

        return c.json({ success: true }, 200);
      } catch (error) {
        console.error('Error deleting AI provider:', error);
        return c.json({ error: 'Failed to delete AI provider' }, 500);
      }
    },
  );

// Keep the old export name for backward compatibility
export const aiProviderAPIKeysRouter = aiProvidersRouter;
