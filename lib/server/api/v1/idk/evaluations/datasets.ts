import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  DataPointCreateParams,
  DataPointQueryParams,
} from '@shared/types/data/data-point';
import {
  DatasetCreateParams,
  DatasetQueryParams,
  DatasetUpdateParams,
} from '@shared/types/data/dataset';
import { Hono } from 'hono';
import { z } from 'zod';

export const datasetsRouter = new Hono<AppEnv>()
  .get('/', zValidator('query', DatasetQueryParams), async (c) => {
    try {
      const query = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const datasets = await connector.getDatasets(query);

      return c.json(datasets);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      return c.json({ error: 'Failed to fetch datasets' }, 500);
    }
  })
  .post('/', zValidator('json', DatasetCreateParams), async (c) => {
    try {
      const params = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      const dataset = await connector.createDataset(params);

      return c.json(dataset, 201);
    } catch (error) {
      console.error('Error creating dataset:', error);
      return c.json({ error: 'Failed to create dataset' }, 500);
    }
  })
  .patch(
    '/:datasetId',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator('json', DatasetUpdateParams),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const params = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const dataset = await connector.updateDataset(datasetId, {
          ...params,
        });

        return c.json(dataset, 200);
      } catch (error) {
        console.error('Error updating dataset:', error);
        return c.json({ error: 'Failed to update dataset' }, 500);
      }
    },
  )
  .delete(
    '/:datasetId',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteDataset(datasetId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting dataset:', error);
        return c.json({ error: 'Failed to delete dataset' }, 500);
      }
    },
  )
  .get(
    '/:datasetId/data-points',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator('query', DataPointQueryParams),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const query = c.req.valid('query');
        const connector = c.get('user_data_storage_connector');

        const dataPoints = await connector.getDataPoints(datasetId, {
          ...query,
        });

        return c.json(dataPoints);
      } catch (error) {
        console.error('Error fetching data points:', error);
        return c.json({ error: 'Failed to fetch data points' }, 500);
      }
    },
  )
  .post(
    '/:datasetId/data-points',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator('json', z.array(DataPointCreateParams)),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const dataPoints = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const createdDataPoints = await connector.createDataPoints(
          datasetId,
          dataPoints,
        );

        return c.json(createdDataPoints, 201);
      } catch (error) {
        console.error('Error creating data points:', error);
        return c.json({ error: 'Failed to create data points' }, 500);
      }
    },
  )
  .delete(
    '/:datasetId/data-points',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator(
      'query',
      z.object({
        dataPointIds: z
          .union([z.string(), z.array(z.string())])
          .transform((val) => (Array.isArray(val) ? val : [val]))
          .pipe(z.array(z.uuid())),
      }),
    ),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const { dataPointIds } = c.req.valid('query');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteDataPoints(datasetId, dataPointIds);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting data point:', error);
        return c.json({ error: 'Failed to delete data point' }, 500);
      }
    },
  );
