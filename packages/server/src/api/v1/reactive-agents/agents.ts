import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@server/types/hono';
import { parseDatabaseError } from '@server/utils/database-error';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import {
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data';
import { Hono } from 'hono';
import { z } from 'zod';

export const agentsRouter = new Hono<AppEnv>()
  .post('/', zValidator('json', AgentCreateParams), async (c) => {
    try {
      const data = c.req.valid('json');
      const connector = c.get('user_data_storage_connector');

      const newAgent = await connector.createAgent(data);

      return c.json(newAgent, 201);
    } catch (error) {
      console.error('Error creating agent:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })
  .get('/', zValidator('query', AgentQueryParams), async (c) => {
    try {
      const query = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const agents = await connector.getAgents(query);

      return c.json(agents, 200);
    } catch (error) {
      console.error('Error fetching agents:', error);
      const errorInfo = parseDatabaseError(error);
      return c.json({ error: errorInfo.message }, errorInfo.statusCode);
    }
  })
  .patch(
    '/:agentId',
    zValidator('param', z.object({ agentId: z.uuid() })),
    zValidator('json', AgentUpdateParams),
    async (c) => {
      try {
        const { agentId } = c.req.valid('param');
        const data = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const updatedAgent = await connector.updateAgent(agentId, data);

        // Emit SSE event for agent update
        emitSSEEvent('agent:updated', {
          agentId: updatedAgent.id,
        });

        return c.json(updatedAgent, 200);
      } catch (error) {
        console.error('Error updating agent:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  )
  .delete(
    '/:agentId',
    zValidator('param', z.object({ agentId: z.uuid() })),
    async (c) => {
      try {
        const { agentId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteAgent(agentId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting agent:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  )
  .get(
    '/:agentId/skills',
    zValidator(
      'param',
      z.object({
        agentId: z.uuid(),
      }),
    ),
    async (c) => {
      try {
        const { agentId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const skills = await connector.getSkills({ agent_id: agentId });

        return c.json(skills, 200);
      } catch (error) {
        console.error('Error fetching skills:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  )
  .get(
    '/:agentId/evaluation-runs',
    zValidator('param', z.object({ agentId: z.uuid() })),
    zValidator(
      'query',
      z.object({
        log_id: z.uuid().optional(),
        created_after: z.string().datetime().optional(),
        created_before: z.string().datetime().optional(),
      }),
    ),
    async (c) => {
      try {
        const { agentId } = c.req.valid('param');
        const { log_id, created_after, created_before } = c.req.valid('query');
        const connector = c.get('user_data_storage_connector');

        const evaluationRuns =
          await connector.getSkillOptimizationEvaluationRuns({
            agent_id: agentId,
            ...(log_id && { log_id }),
            ...(created_after && { created_after }),
            ...(created_before && { created_before }),
          });

        return c.json(evaluationRuns);
      } catch (error) {
        console.error('Error getting evaluation runs:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  )
  .post(
    '/:agentId/evaluation-scores-by-time-bucket',
    zValidator('param', z.object({ agentId: z.uuid() })),
    zValidator(
      'json',
      z.object({
        interval_minutes: z.number().min(1).max(1440),
        start_time: z.string().datetime(),
        end_time: z.string().datetime(),
      }),
    ),
    async (c) => {
      try {
        const { agentId } = c.req.valid('param');
        const { interval_minutes, start_time, end_time } = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        const scores = await connector.getEvaluationScoresByTimeBucket({
          agent_id: agentId,
          interval_minutes,
          start_time,
          end_time,
        });

        return c.json(scores);
      } catch (error) {
        console.error('Error getting evaluation scores by time bucket:', error);
        const errorInfo = parseDatabaseError(error);
        return c.json({ error: errorInfo.message }, errorInfo.statusCode);
      }
    },
  );
