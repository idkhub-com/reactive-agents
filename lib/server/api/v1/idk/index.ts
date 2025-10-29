import { referencesRouter } from '@server/api/v1/idk/references';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { agentsRouter } from './agents';
import { aiProvidersRouter } from './ai-providers';
import { authRouter } from './auth';
import { feedbacksRouter } from './feedbacks';
import { improvedResponsesRouter } from './improved-responses';
import { modelsRouter } from './models';
import { observabilityRouter } from './observability';
import { skillsRouter } from './skills';

export const idkRouter = new Hono<AppEnv>()
  .route('/observability', observabilityRouter)
  .route('/references', referencesRouter)
  .route('/auth', authRouter)
  .route('/agents', agentsRouter)
  .route('/skills', skillsRouter)
  .route('/models', modelsRouter)
  .route('/feedbacks', feedbacksRouter)
  .route('/improved-responses', improvedResponsesRouter)
  .route('/ai-providers', aiProvidersRouter)
  // Keep old endpoint for backward compatibility
  .route('/ai-provider-api-keys', aiProvidersRouter);
