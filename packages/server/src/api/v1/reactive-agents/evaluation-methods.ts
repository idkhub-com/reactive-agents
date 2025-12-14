import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import * as z from 'zod';

export const evaluationMethodsRouter = new Hono<AppEnv>().get('/', (c) => {
  try {
    const evaluationConnectorsMap = c.get('evaluation_connectors_map');

    // Get details from all registered connectors, including parameter schema
    const evaluationMethods = Object.values(evaluationConnectorsMap).map(
      (connector) => {
        const details = connector.getDetails();

        // Extract default values from the parameter schema
        const parameterSchema = connector.getParameterSchema;

        return {
          ...details,
          parameterSchema: z.toJSONSchema(parameterSchema),
        };
      },
    );

    return c.json(evaluationMethods);
  } catch (error) {
    console.error('Error getting evaluation methods:', error);
    return c.json({ error: 'Failed to get evaluation methods' }, 500);
  }
});
