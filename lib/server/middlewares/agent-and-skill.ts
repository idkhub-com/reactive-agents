import type { AppContext } from '@server/types/hono';
import { getAgent } from '@server/utils/idkhub/agents';
import { getSkill } from '@server/utils/idkhub/skills';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

export const agentAndSkillMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    const url = new URL(c.req.url);

    // Only set variables for API requests
    if (url.pathname.startsWith('/v1/')) {
      // Don't set variables for IDK API requests
      if (!url.pathname.startsWith('/v1/idk')) {
        const idkConfig = c.get('idk_config_pre_processed');
        const agent = await getAgent(
          c.get('user_data_storage_connector'),
          idkConfig.agent_name,
        );
        if (!agent) {
          return c.json(
            { error: `Agent with name ${idkConfig.agent_name} not found` },
            404,
          );
        }
        const skill = await getSkill(
          c.get('user_data_storage_connector'),
          agent.id,
          idkConfig.skill_name,
        );
        if (!skill) {
          return c.json(
            { error: `Skill with name ${idkConfig.skill_name} not found` },
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
