import { zValidator } from '@hono/zod-validator';
import {
  argumentCorrectnessEvaluationConnector,
  conversationCompletenessEvaluationConnector,
  knowledgeRetentionEvaluationConnector,
  roleAdherenceEvaluationConnector,
  taskCompletionEvaluationConnector,
  toolCorrectnessEvaluationConnector,
  turnRelevancyEvaluationConnector,
} from '@server/connectors/evaluations';
import type { EvaluationMethodConnector } from '@server/types/connector';
import type { AppEnv } from '@server/types/hono';
import {
  type EvaluationMethodDetails,
  EvaluationMethodName,
  EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations/evaluations';
import { Hono } from 'hono';
import { z } from 'zod';

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
        const connector = evaluationConnectors[method as EvaluationMethodName];

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
        // For now, return a simple schema structure since z.toJSONSchema doesn't exist in v4
        const jsonSchema = {
          type: 'object',
          properties: {},
          description: `Schema for ${method} evaluation method`,
        };

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
  // Execute an evaluation (supports both dataset and single log evaluation)
  .post('/execute', zValidator('json', EvaluationMethodRequest), async (c) => {
    try {
      const request = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      // Get the appropriate evaluation connector using type-safe lookup
      const evaluationConnector =
        evaluationConnectors[request.evaluation_method as EvaluationMethodName];

      if (!evaluationConnector) {
        throw new Error(
          `Unsupported evaluation method: ${request.evaluation_method}`,
        );
      }

      let evaluationConnectorToUse = connector;

      // If this is a single log evaluation, create a mock connector
      if (request.log_id && !request.dataset_id) {
        evaluationConnectorToUse = {
          ...connector,
          async getDatasetLogs(
            _datasetId: string,
            _options?: { limit?: number; offset?: number },
          ) {
            // Get the single log by ID
            const logs = await connector.getLogs({
              id: request.log_id!,
              limit: 1,
              offset: 0,
            });

            if (!logs || logs.length === 0) {
              throw new Error(`Log not found: ${request.log_id}`);
            }

            return logs;
          },
        };

        // For single log evaluation, use log_id as dataset_id placeholder
        request.dataset_id = request.log_id;
        request.name =
          request.name || `Single Log Evaluation - ${request.log_id}`;
        request.description =
          request.description ||
          `Single log evaluation for log ${request.log_id}`;
      }

      // Execute the evaluation using the appropriate connector
      const evaluationRun = await evaluationConnector.evaluate(
        request as EvaluationMethodRequest & { dataset_id: string },
        evaluationConnectorToUse,
      );

      const iseSingleLog = !!request.log_id;
      return c.json(
        {
          evaluation_run_id: evaluationRun.id,
          status: evaluationRun.status,
          message: iseSingleLog
            ? 'Single log evaluation completed successfully'
            : 'Evaluation has been completed successfully',
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
