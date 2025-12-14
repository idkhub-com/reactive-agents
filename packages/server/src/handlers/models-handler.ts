import models from '@server/data/models.json';
import providers from '@server/data/providers.json';
import type { AppContext } from '@server/types/hono';
import type { GatewayModel } from '@shared/types/ai-model';

/**
 * Handles the models request. Returns a list of models supported by the Ai gateway.
 * Allows filters in query params for the provider
 */
export function modelsHandler(c: AppContext): Response {
  // If the request does not contain a provider query param, return all models. Add a count as well.
  const provider = c.req.query('provider');
  if (!provider) {
    return c.json({
      ...models,
      count: models.data.length,
    });
  } else {
    // Filter the models by the provider
    const filteredModels = models.data.filter(
      (model: GatewayModel) => model.provider.id === provider,
    );
    return c.json({
      ...models,
      data: filteredModels,
      count: filteredModels.length,
    });
  }
}

/**
 * Handles the providers request. Returns a list of providers supported by the Ai gateway.
 */
export function providersHandler(c: AppContext): Response {
  return c.json({
    ...providers,
    count: providers.data.length,
  });
}
