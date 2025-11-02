import { referencesRouter } from '@server/api/v1/reactive-agents/references';
import { sseEventsMiddleware } from '@server/middlewares/sse-events';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { agentsRouter } from './agents';
import { aiProvidersRouter } from './ai-providers';
import { authRouter } from './auth';
import { eventsRouter } from './events';
import { feedbacksRouter } from './feedbacks';
import { improvedResponsesRouter } from './improved-responses';
import { modelsRouter } from './models';
import { observabilityRouter } from './observability';
import { skillsRouter } from './skills';

export const reactiveAgentsRouter = new Hono<AppEnv>()
  // Apply SSE events middleware to all reactive-agents routes
  .use('*', sseEventsMiddleware)
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
  .route('/ai-provider-api-keys', aiProvidersRouter)
  .route('/events', eventsRouter);
