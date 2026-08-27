import type { AppContext } from '@api/types/hono';
import { getAgent } from '@api/utils/super-agents/agents';
import { getSkill } from '@api/utils/super-agents/skills';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

export const agentAndSkillMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    const url = new URL(c.req.url);

    // Only set variables for API requests
    if (url.pathname.startsWith('/v1/')) {
      // Don't set variables for Super Agents API requests
      if (!url.pathname.startsWith('/v1/super-agents')) {
        const saConfig = c.get('sa_config_pre_processed');
        const agent = await getAgent(
          c,
          c.get('user_data_storage_connector'),
          saConfig.agent_name,
        );
        if (!agent) {
          return c.json(
            { error: `Agent with name ${saConfig.agent_name} not found` },
            404,
          );
        }
        const skill = await getSkill(
          c,
          c.get('user_data_storage_connector'),
          agent.id,
          agent.name,
          saConfig.skill_name,
        );
        if (!skill) {
          return c.json(
            { error: `Skill with name ${saConfig.skill_name} not found` },
            404,
          );
        }
        c.set('agent', agent);
        c.set('skill', skill);
      }
    }
    await next();
  },
);
