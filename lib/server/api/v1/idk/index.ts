import { referencesRouter } from '@server/api/v1/idk/references';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { agentsRouter } from './agents';
import { aiProviderAPIKeysRouter } from './ai-provider-api-keys';
import { authRouter } from './auth';
import { evaluationsRouter } from './evaluations';
import { feedbacksRouter } from './feedbacks';
import { improvedResponsesRouter } from './improved-responses';
import { modelsRouter } from './models';
import { observabilityRouter } from './observability';
import { skillOptimizationsRouter } from './skill-optimizations';
import { skillsRouter } from './skills';

export const idkRouter = new Hono<AppEnv>()
  .route('/observability', observabilityRouter)
  .route('/references', referencesRouter)
  .route('/auth', authRouter)
  .route('/evaluations', evaluationsRouter)
  .route('/agents', agentsRouter)
  .route('/skills', skillsRouter)
  .route('/skill-optimizations', skillOptimizationsRouter)
  .route('/models', modelsRouter)
  .route('/feedbacks', feedbacksRouter)
  .route('/improved-responses', improvedResponsesRouter)
  .route('/ai-provider-api-keys', aiProviderAPIKeysRouter);
