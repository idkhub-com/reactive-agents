import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  ImprovedResponseCreateParams,
  ImprovedResponseQueryParams,
  ImprovedResponseUpdateParams,
} from '@shared/types/data/improved-response';
import { Hono } from 'hono';
import z from 'zod';

export const improvedResponsesRouter = new Hono<AppEnv>()
  .get('/', zValidator('query', ImprovedResponseQueryParams), async (c) => {
    try {
      const queryParams = c.req.valid('query');

      const improvedResponse = await c
        .get('user_data_storage_connector')
        .getImprovedResponse(queryParams);

      return c.json(improvedResponse);
    } catch (error) {
      console.error('Error retrieving improved response:', error);
      return c.json({ error: 'Failed to retrieve improved response' }, 500);
    }
  })

  // CREATE a new improved response
  .post('/', zValidator('json', ImprovedResponseCreateParams), async (c) => {
    try {
      const validatedData = c.req.valid('json');

      // Create the improved response (timestamps and ID are added during validation)
      const improvedResponse = await c
        .get('user_data_storage_connector')
        .createImprovedResponse(validatedData);

      return c.json(improvedResponse, 201);
    } catch (error) {
      console.error('Error creating improved response:', error);
      return c.json({ error: 'Failed to create improved response' }, 500);
    }
  })

  // PATCH an improved response
  .patch(
    '/:improvedResponseId',
    zValidator(
      'param',
      z.object({
        improvedResponseId: z.string().uuid(),
      }),
    ),
    zValidator('json', ImprovedResponseUpdateParams),
    async (c) => {
      try {
        const { improvedResponseId } = c.req.valid('param');
        const updateData = c.req.valid('json');

        // Update the improved response (updated_at is added during validation)
        const updatedResponse = await c
          .get('user_data_storage_connector')
          .updateImprovedResponse(improvedResponseId, updateData);

        return c.json(updatedResponse);
      } catch (error) {
        console.error('Error updating improved response:', error);
        return c.json({ error: 'Failed to update improved response' }, 500);
      }
    },
  )

  // DELETE an improved response
  .delete(
    '/:improvedResponseId',
    zValidator('param', z.object({ improvedResponseId: z.string().uuid() })),
    async (c) => {
      try {
        const { improvedResponseId } = c.req.valid('param');

        await c
          .get('user_data_storage_connector')
          .deleteImprovedResponse(improvedResponseId);
        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting improved response:', error);
        return c.json({ error: 'Failed to delete improved response' }, 500);
      }
    },
  );
