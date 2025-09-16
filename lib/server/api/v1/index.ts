import { chatRouter } from '@server/api/v1/chat';
import { completionsRouter } from '@server/api/v1/completions';
import { idkRouter } from '@server/api/v1/idk';
import { responsesRouter } from '@server/api/v1/responses';
import { argumentCorrectnessEvaluationConnector } from '@server/connectors/evaluations/argument-correctness';
import { conversationCompletenessEvaluationConnector } from '@server/connectors/evaluations/conversation-completeness';
import { knowledgeRetentionEvaluationConnector } from '@server/connectors/evaluations/knowledge-retention';
import { roleAdherenceEvaluationConnector } from '@server/connectors/evaluations/role-adherence';
import { taskCompletionEvaluationConnector } from '@server/connectors/evaluations/task-completion';
import { toolCorrectnessEvaluationConnector } from '@server/connectors/evaluations/tool-correctness';
import { turnRelevancyEvaluationConnector } from '@server/connectors/evaluations/turn-relevancy';

import {
  supabaseCacheStorageConnector,
  supabaseLogsStorageConnector,
  supabaseUserDataStorageConnector,
} from '@server/connectors/supabase';
import { agentAndSkillMiddleware } from '@server/middlewares/agent-and-skill';
import { authenticatedMiddleware } from '@server/middlewares/auth';
import { cacheMiddleware } from '@server/middlewares/cache';
import { evaluationMethodConnectors } from '@server/middlewares/evaluations';
import { hooksMiddleware } from '@server/middlewares/hooks';
import { logsMiddleware } from '@server/middlewares/logs';
import { toolMiddleware } from '@server/middlewares/tool';
import { userDataMiddleware } from '@server/middlewares/user-data';
import { commonVariablesMiddleware } from '@server/middlewares/variables';
import type { AppEnv, AppHono } from '@server/types/hono';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { prettyJSON } from 'hono/pretty-json';
import { handle } from 'hono/vercel';

const factory = createFactory<AppEnv>();

const app: AppHono = new Hono<AppEnv>().basePath('/v1');

app.get('/', (c) => c.text('idk'));

// Use prettyJSON middleware for all routes
app.use('*', prettyJSON());

// Keep this middleware before the other middlewares
// so that the common variables are available to the other middlewares
app.use('*', commonVariablesMiddleware(factory));

// Keep this middleware before agent and skill middleware
// Use user data middleware for all routes
app.use('*', userDataMiddleware(factory, supabaseUserDataStorageConnector));

// Use agent and skill middleware for all routes
app.use('*', agentAndSkillMiddleware);

// Use logs middleware for all routes
app.use('*', logsMiddleware(factory, supabaseLogsStorageConnector));

// Use hooks middleware for all routes
app.use('*', hooksMiddleware(factory, []));

// Use evaluation middleware for all routes
app.use(
  '*',
  evaluationMethodConnectors(factory, [
    argumentCorrectnessEvaluationConnector,
    conversationCompletenessEvaluationConnector,
    knowledgeRetentionEvaluationConnector,
    roleAdherenceEvaluationConnector,
    taskCompletionEvaluationConnector,
    toolCorrectnessEvaluationConnector,
    turnRelevancyEvaluationConnector,
  ]),
);

// Use cache middleware for all routes
app.use('*', cacheMiddleware(factory, supabaseCacheStorageConnector));

// Use authenticated middleware for all routes
app.use('*', authenticatedMiddleware(factory));

// Use tool middleware for all routes
app.use(toolMiddleware);

app.route('/chat', chatRouter);
app.route('/completions', completionsRouter);
app.route('/responses', responsesRouter);
const idkRoute = app.route('/idk', idkRouter);

export type IdkRoute = typeof idkRoute;

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
