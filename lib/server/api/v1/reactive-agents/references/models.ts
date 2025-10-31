import models from '@server/data/models.json';
import type { AppEnv } from '@server/types/hono';
import type { GatewayModel } from '@shared/types/ai-model';
import { Hono } from 'hono';

export const modelsRouter = new Hono<AppEnv>()
  /**
   * Handles the models request. Returns a list of models supported by the Ai gateway.
   * Allows filters in query params for the provider
   */
  .get((c) => {
    const provider = c.req.query('provider');
    if (!provider) {
      return c.json({
        ...models,
        count: models.data.length,
      });
    }
    const filteredModels = models.data.filter(
      (model: GatewayModel) => model.provider.id === provider,
    );
    return c.json({
      ...models,
      data: filteredModels,
      count: filteredModels.length,
    });
  });
