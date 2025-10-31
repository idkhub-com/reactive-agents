import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { modelsRouter } from './models';
import { providersRouter } from './providers';

export const referencesRouter = new Hono<AppEnv>()
  .route('/models', modelsRouter)
  .route('/providers', providersRouter);
