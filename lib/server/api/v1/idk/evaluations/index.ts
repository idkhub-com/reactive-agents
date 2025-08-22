import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { datasetsRouter } from './datasets';
import { methodsRouter } from './methods';
import { runsRouter } from './runs';

export const evaluationsRouter = new Hono<AppEnv>()
  .route('/runs', runsRouter)
  .route('/datasets', datasetsRouter)
  .route('/methods', methodsRouter);
