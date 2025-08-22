import { referencesRouter } from '@server/api/v1/idk/references';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { agentsRouter } from './agents';
import { authRouter } from './auth';
import { evaluationsRouter } from './evaluations';
import { feedbacksRouter } from './feedbacks';
import { improvedResponsesRouter } from './improved-responses';
import { observabilityRouter } from './observability';
import { skillsRouter } from './skills';

export const idkRouter = new Hono<AppEnv>()
  .route('/observability', observabilityRouter)
  .route('/references', referencesRouter)
  .route('/auth', authRouter)
  .route('/evaluations', evaluationsRouter)
  .route('/agents', agentsRouter)
  .route('/skills', skillsRouter)
  .route('/feedbacks', feedbacksRouter)
  .route('/improved-responses', improvedResponsesRouter);
