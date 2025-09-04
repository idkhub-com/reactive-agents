import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import {
  DatasetCreateParams,
  DatasetQueryParams,
  DatasetUpdateParams,
} from '@shared/types/data/dataset';
import { LogsQueryParams } from '@shared/types/data/log';
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
    '/:datasetId/logs',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator('query', LogsQueryParams),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const query = c.req.valid('query');
        const connector = c.get('user_data_storage_connector');

        const logs = await connector.getDatasetLogs(datasetId, {
          ...query,
        });

        return c.json(logs);
      } catch (error) {
        console.error('Error fetching logs:', error);
        return c.json({ error: 'Failed to fetch logs' }, 500);
      }
    },
  )
  .post(
    '/:datasetId/logs',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator(
      'json',
      z.object({
        logIds: z.array(z.string().uuid()),
      }),
    ),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const logs = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        await connector.addLogsToDataset(datasetId, logs.logIds);

        return c.json({ success: true }, 201);
      } catch (error) {
        console.error('Error adding logs to dataset:', error);
        return c.json({ error: 'Failed to add logs to dataset' }, 500);
      }
    },
  )
  .delete(
    '/:datasetId/logs',
    zValidator(
      'param',
      z.object({
        datasetId: z.uuid(),
      }),
    ),
    zValidator(
      'query',
      z.object({
        logIds: z
          .union([z.string(), z.array(z.string())])
          .transform((val) => (Array.isArray(val) ? val : [val]))
          .pipe(z.array(z.uuid())),
      }),
    ),
    async (c) => {
      try {
        const { datasetId } = c.req.valid('param');
        const { logIds } = c.req.valid('query');
        const connector = c.get('user_data_storage_connector');

        await connector.removeLogsFromDataset(datasetId, logIds);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting logs:', error);
        return c.json({ error: 'Failed to delete logs' }, 500);
      }
    },
  );
