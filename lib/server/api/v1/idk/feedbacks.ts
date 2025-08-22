import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  FeedbackCreateParams,
  FeedbackQueryParams,
} from '@shared/types/data/feedback';
import { Hono } from 'hono';
import z from 'zod';

export const feedbacksRouter = new Hono<AppEnv>()
  // GET feedback with optional filters (including by ID)
  .get('/', zValidator('query', FeedbackQueryParams), async (c) => {
    try {
      const queryParams = c.req.valid('query');
      const feedback = await c
        .get('user_data_storage_connector')
        .getFeedback(queryParams);
      return c.json(feedback);
    } catch (error) {
      console.error('Error retrieving feedback:', error);
      return c.json({ error: 'Failed to retrieve feedback' }, 500);
    }
  })
  // Create new feedback
  .post('/', zValidator('json', FeedbackCreateParams), async (c) => {
    try {
      const feedbackData = c.req.valid('json');

      const newFeedback = await c
        .get('user_data_storage_connector')
        .createFeedback(feedbackData);
      return c.json(newFeedback, 201);
    } catch (error) {
      console.error('Error creating feedback:', error);
      return c.json({ error: 'Failed to create feedback' }, 500);
    }
  })
  // Delete feedback
  .delete(
    '/:feedbackId',
    zValidator('param', z.object({ feedbackId: z.string().uuid() })),
    async (c) => {
      try {
        const { feedbackId } = c.req.valid('param');

        // Delete the feedback directly without existence check
        await c.get('user_data_storage_connector').deleteFeedback(feedbackId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting feedback:', error);
        return c.json({ error: 'Failed to delete feedback' }, 500);
      }
    },
  );
