import { initializeModelCapabilities } from '@server/ai-providers/initialize-capabilities';
import { chatRouter } from '@server/api/v1/chat';
import { completionsRouter } from '@server/api/v1/completions';
import { embeddingsRouter } from '@server/api/v1/embeddings';
import { reactiveAgentsRouter } from '@server/api/v1/reactive-agents';
import { responsesRouter } from '@server/api/v1/responses';
// import { argumentCorrectnessEvaluationConnector } from '@server/connectors/evaluations/argument-correctness';
import { conversationCompletenessEvaluationConnector } from '@server/connectors/evaluations/conversation-completeness';
import { knowledgeRetentionEvaluationConnector } from '@server/connectors/evaluations/knowledge-retention';
import { latencyEvaluationConnector } from '@server/connectors/evaluations/latency/latency';
// import { roleAdherenceEvaluationConnector } from '@server/connectors/evaluations/role-adherence';
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
import { raConfigurationInjectorMiddleware } from '@server/middlewares/reactive-agents-configuration';
import { toolMiddleware } from '@server/middlewares/tool';
import { userDataMiddleware } from '@server/middlewares/user-data';
import { commonVariablesMiddleware } from '@server/middlewares/variables';
import type { AppEnv, AppHono } from '@server/types/hono';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { prettyJSON } from 'hono/pretty-json';
import { handle } from 'hono/vercel';

const factory = createFactory<AppEnv>();

// Initialize model capabilities on server startup
initializeModelCapabilities();

const app: AppHono = new Hono<AppEnv>().basePath('/v1');

app.get('/', (c) => c.text('Reactive Agents'));

// Use prettyJSON middleware for all routes
app.use('*', prettyJSON());

// Keep this middleware before the other middlewares
// so that the common variables are available to the other middlewares
app.use('*', commonVariablesMiddleware);

// Keep this middleware before agent and skill middleware
// Use user data middleware for all routes
app.use('*', userDataMiddleware(factory, supabaseUserDataStorageConnector));

// Use logs middleware for all routes
// Runs skill optimizer after processing logs
app.use('*', logsMiddleware(factory, supabaseLogsStorageConnector));

// Use hooks middleware for all routes
app.use('*', hooksMiddleware(factory, []));

// Use evaluation middleware for all routes
app.use(
  '*',
  evaluationMethodConnectors(factory, [
    // argumentCorrectnessEvaluationConnector,
    conversationCompletenessEvaluationConnector,
    knowledgeRetentionEvaluationConnector,
    latencyEvaluationConnector,
    // roleAdherenceEvaluationConnector,
    taskCompletionEvaluationConnector,
    toolCorrectnessEvaluationConnector,
    turnRelevancyEvaluationConnector,
  ]),
);

// Use cache middleware for all routes
app.use('*', cacheMiddleware(factory, supabaseCacheStorageConnector));

// Use authenticated middleware for all routes
app.use('*', authenticatedMiddleware(factory));

// Use agent and skill middleware for all routes
app.use('*', agentAndSkillMiddleware);

// Use Reactive Agents configuration injector middleware for all routes
app.use('*', raConfigurationInjectorMiddleware);

// Use tool middleware for all routes
app.use(toolMiddleware);

app.route('/chat', chatRouter);
app.route('/completions', completionsRouter);
app.route('/responses', responsesRouter);
app.route('/embeddings', embeddingsRouter);
const reactiveAgentsRoute = app.route('/reactive-agents', reactiveAgentsRouter);

export type ReactiveAgentsRoute = typeof reactiveAgentsRoute;

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
