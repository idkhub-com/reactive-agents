import type { AppContext } from '@server/types/hono';
import { getOrCreateAgent } from '@server/utils/idkhub/agents';
import { getOrCreateSkill } from '@server/utils/idkhub/skills';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

export const agentAndSkillMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    const url = new URL(c.req.url);

    // Only set variables for API requests
    if (url.pathname.startsWith('/v1/')) {
      // Don't set variables for IDK API requests
      if (!url.pathname.startsWith('/v1/idk')) {
        const idkConfig = c.get('idk_config');
        const agent = await getOrCreateAgent(
          c.get('user_data_storage_connector'),
          idkConfig.agent_name,
        );
        const skill = await getOrCreateSkill(
          c.get('user_data_storage_connector'),
          agent.id,
          idkConfig.skill_name,
        );
        c.set('agent', agent);
        c.set('skill', skill);
      }
    }
    await next();
  },
);
