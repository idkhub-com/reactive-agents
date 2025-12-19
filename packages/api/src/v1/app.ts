import { initializeModelCapabilities } from '@api/ai-providers/initialize-capabilities';
// import { argumentCorrectnessEvaluationConnector } from '@api/connectors/evaluations/argument-correctness';
import { conversationCompletenessEvaluationConnector } from '@api/connectors/evaluations/conversation-completeness';
import { knowledgeRetentionEvaluationConnector } from '@api/connectors/evaluations/knowledge-retention';
import { latencyEvaluationConnector } from '@api/connectors/evaluations/latency/latency';
// import { roleAdherenceEvaluationConnector } from '@api/connectors/evaluations/role-adherence';
import { taskCompletionEvaluationConnector } from '@api/connectors/evaluations/task-completion';
import { toolCorrectnessEvaluationConnector } from '@api/connectors/evaluations/tool-correctness';
import { turnRelevancyEvaluationConnector } from '@api/connectors/evaluations/turn-relevancy';
import {
  supabaseCacheStorageConnector,
  supabaseLogsStorageConnector,
  supabaseUserDataStorageConnector,
} from '@api/connectors/supabase';
import { agentAndSkillMiddleware } from '@api/middlewares/agent-and-skill';
import { authenticatedMiddleware } from '@api/middlewares/auth';
import { cacheMiddleware } from '@api/middlewares/cache';
import { evaluationMethodConnectors } from '@api/middlewares/evaluations';
import { hooksMiddleware } from '@api/middlewares/hooks';
import { logsMiddleware } from '@api/middlewares/logs';
import { raConfigurationInjectorMiddleware } from '@api/middlewares/reactive-agents-configuration';
import { toolMiddleware } from '@api/middlewares/tool';
import { userDataMiddleware } from '@api/middlewares/user-data';
import { commonVariablesMiddleware } from '@api/middlewares/variables';
import type { AppEnv, AppHono } from '@api/types/hono';
import { chatRouter } from '@api/v1/chat';
import { completionsRouter } from '@api/v1/completions';
import { embeddingsRouter } from '@api/v1/embeddings';
import { reactiveAgentsRouter } from '@api/v1/reactive-agents';
import { responsesRouter } from '@api/v1/responses';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createFactory } from 'hono/factory';
import { prettyJSON } from 'hono/pretty-json';

const factory = createFactory<AppEnv>();

// Initialize model capabilities on server startup
initializeModelCapabilities();

const app: AppHono = new Hono<AppEnv>().basePath('/v1');

app.get('/', (c) => c.text('Reactive Agents API'));

// CORS middleware for cross-origin requests
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow configured origins or localhost for development
      const allowedOrigins = process.env.WEB_APP_URL
        ? [process.env.WEB_APP_URL]
        : [
            'http://localhost:3000',
            'http://localhost:8787',
            'http://localhost:3001',
          ];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'ra-config'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

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

export default app;
