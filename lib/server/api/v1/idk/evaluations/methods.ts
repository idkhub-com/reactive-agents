import { zValidator } from '@hono/zod-validator';

import { answerRelevancyEvaluationConnector } from '@server/connectors/evaluations/answer-relevancy';
import { argumentCorrectnessEvaluationConnector } from '@server/connectors/evaluations/argument-correctness';
import { conversationCompletenessEvaluationConnector } from '@server/connectors/evaluations/conversation-completeness';
import { knowledgeRetentionEvaluationConnector } from '@server/connectors/evaluations/knowledge-retention';
import { roleAdherenceEvaluationConnector } from '@server/connectors/evaluations/role-adherence';
import { taskCompletionEvaluationConnector } from '@server/connectors/evaluations/task-completion';
import { toolCorrectnessEvaluationConnector } from '@server/connectors/evaluations/tool-correctness';
import { turnRelevancyEvaluationConnector } from '@server/connectors/evaluations/turn-relevancy';
import type { EvaluationMethodConnector } from '@server/types/connector';
import type { AppEnv } from '@server/types/hono';
import { evaluateExistingLogsInRealtimeDataset } from '@server/utils/realtime-evaluations';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import {
  type EvaluationMethodDetails,
  EvaluationMethodName,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations/evaluations';
import { Hono } from 'hono';
import { toJSONSchema, z } from 'zod';

// Registry of all available evaluation connectors - automatically discovers attached connectors
const evaluationConnectors: Record<
  EvaluationMethodName,
  EvaluationMethodConnector
> = {
  [EvaluationMethodName.TASK_COMPLETION]: taskCompletionEvaluationConnector,
  [EvaluationMethodName.ARGUMENT_CORRECTNESS]:
    argumentCorrectnessEvaluationConnector,
  [EvaluationMethodName.KNOWLEDGE_RETENTION]:
    knowledgeRetentionEvaluationConnector,
  [EvaluationMethodName.ROLE_ADHERENCE]: roleAdherenceEvaluationConnector,
  [EvaluationMethodName.TURN_RELEVANCY]: turnRelevancyEvaluationConnector,
  [EvaluationMethodName.TOOL_CORRECTNESS]: toolCorrectnessEvaluationConnector,
  [EvaluationMethodName.CONVERSATION_COMPLETENESS]:
    conversationCompletenessEvaluationConnector,
  [EvaluationMethodName.ANSWER_RELEVANCY]: answerRelevancyEvaluationConnector,
};

// Dynamically generate evaluation methods from attached connectors
function getEvaluationMethods(): Record<
  EvaluationMethodName,
  EvaluationMethodDetails
> {
  const methods: Record<EvaluationMethodName, EvaluationMethodDetails> =
    {} as Record<EvaluationMethodName, EvaluationMethodDetails>;

  for (const [methodName, connector] of Object.entries(evaluationConnectors)) {
    methods[methodName as EvaluationMethodName] = connector.getDetails();
  }

  return methods;
}

// Dynamically get schema for a specific evaluation method
function getEvaluationSchema(method: EvaluationMethodName) {
  const connector = evaluationConnectors[method];
  return connector?.getParameterSchema;
}

export const methodsRouter = new Hono<AppEnv>()
  // Get all available evaluation methods
  .get('/', (c) => {
    try {
      const methods = Object.values(getEvaluationMethods());
      return c.json(methods, 200);
    } catch (error) {
      console.error('Error fetching evaluation methods:', error);
      return c.json({ error: 'Failed to fetch evaluation methods' }, 500);
    }
  })
  // Get details for a specific evaluation method
  .get(
    '/:method',
    zValidator(
      'param',
      z.object({
        method: z.enum(EvaluationMethodName),
      }),
    ),
    (c) => {
      try {
        const { method } = c.req.valid('param');
        const connector = evaluationConnectors[method];

        if (!connector) {
          return c.json({ error: 'Evaluation method not found' }, 404);
        }

        const methodDetails = connector.getDetails();
        return c.json(methodDetails, 200);
      } catch (error) {
        console.error('Error fetching evaluation method details:', error);
        return c.json(
          { error: 'Failed to fetch evaluation method details' },
          500,
        );
      }
    },
  )
  // Get schema for a specific evaluation method
  .get(
    '/:method/schema',
    zValidator(
      'param',
      z.object({
        method: z.enum(EvaluationMethodName),
      }),
    ),
    (c) => {
      try {
        const { method } = c.req.valid('param');
        const schema = getEvaluationSchema(method);

        if (!schema) {
          return c.json(
            { error: 'Schema not found for evaluation method' },
            404,
          );
        }

        // Convert Zod schema to JSON schema for client consumption
        const jsonSchema = toJSONSchema(schema);

        return c.json(jsonSchema, 200);
      } catch (error) {
        console.error('Error fetching evaluation method schema:', error);
        return c.json(
          { error: 'Failed to fetch evaluation method schema' },
          500,
        );
      }
    },
  )
  // Execute an evaluation
  .post('/execute', zValidator('json', EvaluationRunJobDetails), async (c) => {
    try {
      const request = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      // Check if this is a realtime dataset
      const datasets = await connector.getDatasets({
        id: request.dataset_id,
      });
      const dataset = datasets?.[0];

      if (dataset?.is_realtime) {
        // For realtime datasets, we create the evaluation run but don't process logs immediately
        // The logs will be evaluated as they come in through the middleware
        console.log(
          `Creating realtime evaluation for dataset ${request.dataset_id} (realtime_size: ${dataset.realtime_size})`,
        );

        // Create the evaluation run with running status for realtime
        const evaluationRun = await connector.createEvaluationRun({
          dataset_id: request.dataset_id,
          agent_id: request.agent_id,
          skill_id: request.skill_id,
          evaluation_method: request.evaluation_method,
          name:
            request.name ||
            `Realtime ${request.evaluation_method} Evaluation - ${new Date().toISOString()}`,
          description:
            request.description ||
            `Realtime evaluation for dataset ${request.dataset_id}`,
          metadata: {
            parameters: request.parameters,
            is_realtime: true,
          },
        });

        // Update status to running since we're about to process existing logs
        await connector.updateEvaluationRun(evaluationRun.id, {
          status: EvaluationRunStatus.RUNNING,
          started_at: new Date().toISOString(),
        });

        // Get evaluation connectors map from context to trigger backfill
        const evaluationConnectorsMap = c.get('evaluation_connectors_map');
        if (evaluationConnectorsMap) {
          // Process existing logs immediately (synchronously)
          try {
            await evaluateExistingLogsInRealtimeDataset(
              evaluationRun,
              evaluationConnectorsMap,
              connector,
            );
            console.log(
              `Completed backfill evaluation for realtime evaluation run ${evaluationRun.id}`,
            );

            // For realtime evaluations, we keep the status as 'running' so it can continue
            // to evaluate new logs, but we mark that the initial processing is complete
            await connector.updateEvaluationRun(evaluationRun.id, {
              status: EvaluationRunStatus.RUNNING, // Keep running for new logs
              metadata: {
                parameters: request.parameters,
                is_realtime: true,
                backfill_completed: true,
                backfill_completed_at: new Date().toISOString(),
              },
            });
          } catch (error) {
            console.error(
              `Error in backfill evaluation for realtime evaluation run ${evaluationRun.id}:`,
              error,
            );
            // Update status to indicate error in backfill, but keep running for new logs
            await connector.updateEvaluationRun(evaluationRun.id, {
              status: EvaluationRunStatus.RUNNING,
              metadata: {
                parameters: request.parameters,
                is_realtime: true,
                backfill_error:
                  error instanceof Error ? error.message : String(error),
                backfill_attempted_at: new Date().toISOString(),
              },
            });
          }
        }

        // Get updated evaluation run with results from backfill
        const updatedRuns = await connector.getEvaluationRuns({
          id: evaluationRun.id,
        });
        const updatedEvaluationRun = updatedRuns[0] || evaluationRun;

        return c.json(
          {
            evaluation_run_id: updatedEvaluationRun.id,
            status: updatedEvaluationRun.status,
            message:
              'Realtime evaluation has been created and existing logs have been processed',
            results: updatedEvaluationRun.results,
            is_realtime: true,
          },
          200,
        );
      }

      // For regular datasets, use the standard evaluation flow
      const evaluationConnector =
        evaluationConnectors[request.evaluation_method];

      if (!evaluationConnector) {
        throw new Error(
          `Unsupported evaluation method: ${request.evaluation_method}`,
        );
      }

      // Execute the evaluation using the connector - this handles everything
      const evaluationRun = await evaluationConnector.evaluate(
        request,
        connector,
      );

      return c.json(
        {
          evaluation_run_id: evaluationRun.id,
          status: evaluationRun.status,
          message: 'Evaluation has been completed successfully',
          results: evaluationRun.results,
        },
        200,
      );
    } catch (error) {
      console.error('Error executing evaluation:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return c.json(
        {
          error: 'Failed to execute evaluation',
          details: errorMessage,
        },
        500,
      );
    }
  });
