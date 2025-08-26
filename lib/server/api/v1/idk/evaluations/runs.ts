import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { DataPointOutputQueryParams } from '@shared/types/data/data-point-output';
import {
  EvaluationRunCreateParams,
  EvaluationRunQueryParams,
  EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';
import { Hono } from 'hono';
import { z } from 'zod';

export const runsRouter = new Hono<AppEnv>()
  .get(
    '/',
    zValidator('query', EvaluationRunQueryParams.optional()),
    async (c) => {
      try {
        const query = c.req.valid('query') || {};
        const connector = c.get('user_data_storage_connector');

        const evaluationRuns = await connector.getEvaluationRuns(query);

        return c.json(evaluationRuns, 200);
      } catch (error) {
        console.error('Error fetching evaluation runs:', error);
        return c.json({ error: 'Failed to fetch evaluation runs' }, 500);
      }
    },
  )
  .get(
    '/:runId',
    zValidator(
      'param',
      z.object({
        runId: z.uuid(),
      }),
    ),
    async (c) => {
      try {
        const { runId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const evaluationRuns = await connector.getEvaluationRuns({ id: runId });
        const evaluationRun = evaluationRuns[0];

        if (!evaluationRun) {
          return c.json({ error: 'Evaluation run not found' }, 404);
        }

        return c.json(evaluationRun, 200);
      } catch (error) {
        console.error('Error fetching evaluation run:', error);
        return c.json({ error: 'Failed to fetch evaluation run' }, 500);
      }
    },
  )
  .post('/', zValidator('json', EvaluationRunCreateParams), async (c) => {
    try {
      const params = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      const evaluationRun = await connector.createEvaluationRun(params);

      return c.json(evaluationRun, 201);
    } catch (error) {
      console.error('Error creating evaluation run:', error);
      return c.json({ error: 'Failed to create evaluation run' }, 500);
    }
  })
  .patch(
    '/:evaluationRunId',
    zValidator(
      'param',
      z.object({
        evaluationRunId: z.uuid(),
      }),
    ),
    zValidator('json', EvaluationRunUpdateParams),
    async (c) => {
      try {
        const { evaluationRunId } = c.req.valid('param');
        const params = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const evaluationRun = await connector.updateEvaluationRun(
          evaluationRunId,
          {
            ...params,
          },
        );

        return c.json(evaluationRun, 200);
      } catch (error) {
        console.error('Error updating evaluation run:', error);
        return c.json({ error: 'Failed to update evaluation run' }, 500);
      }
    },
  )
  .delete(
    '/:evaluationRunId',
    zValidator(
      'param',
      z.object({
        evaluationRunId: z.uuid(),
      }),
    ),
    async (c) => {
      try {
        const { evaluationRunId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteEvaluationRun(evaluationRunId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting evaluation run:', error);
        return c.json({ error: 'Failed to delete evaluation run' }, 500);
      }
    },
  )
  .get(
    '/:evaluationRunId/data-point-outputs',
    zValidator(
      'param',
      z.object({
        evaluationRunId: z.uuid(),
      }),
    ),
    zValidator('query', DataPointOutputQueryParams.optional()),
    async (c) => {
      try {
        const { evaluationRunId } = c.req.valid('param');
        const query = c.req.valid('query') || {};
        const connector = c.get('user_data_storage_connector');

        const dataPoints = await connector.getDataPointOutputs(
          evaluationRunId,
          query,
        );

        return c.json(dataPoints);
      } catch (error) {
        console.error('Error fetching data points:', error);
        return c.json({ error: 'Failed to fetch data points' }, 500);
      }
    },
  );
