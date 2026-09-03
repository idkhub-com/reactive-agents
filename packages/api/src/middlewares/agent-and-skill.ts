import { markRequestStarted } from '@api/middlewares/logs';
import type { AppContext } from '@api/types/hono';
import { getAgent } from '@api/utils/super-agents/agents';
import {
  learnSkillIntent,
  routeRequestToSkill,
  SkillRoutingError,
} from '@api/utils/super-agents/skill-routing';
import { getSkill } from '@api/utils/super-agents/skills';
import { warn } from '@shared/console-logging';
import type { Skill } from '@shared/types/data/skill';
import type { Next } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { createMiddleware } from 'hono/factory';

export const agentAndSkillMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    const url = new URL(c.req.url);
    // What the router learns from this request, once it has been answered.
    let learn: (() => Promise<void>) | null = null;

    // Only set variables for API requests
    if (url.pathname.startsWith('/v1/')) {
      // Don't set variables for Super Agents API requests
      if (!url.pathname.startsWith('/v1/super-agents')) {
        const saConfig = c.get('sa_config_pre_processed');
        const connector = c.get('user_data_storage_connector');
        const agent = await getAgent(c, connector, saConfig.agent_name);
        if (!agent) {
          return c.json(
            { error: `Agent with name ${saConfig.agent_name} not found` },
            404,
          );
        }

        let skill: Skill | null;
        if (saConfig.skill_name) {
          skill = await getSkill(
            c,
            connector,
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
          // A request that names its skill is the surest sign of what the
          // skill is for. The internal skills are exempt: their traffic is
          // the server's own, and embedding is one of them.
          const saRequestData = c.get('sa_request_data');
          if (agent.name !== 'super-agents' && saRequestData) {
            const named = skill;
            learn = () =>
              learnSkillIntent(c, connector, agent, named, saRequestData);
          }
        } else {
          // The caller named only the agent, so the skill is picked here.
          try {
            const routed = await routeRequestToSkill(
              c,
              connector,
              agent,
              c.get('sa_request_data'),
            );
            skill = routed.skill;
            c.set('skill_routing', routed.decision);
          } catch (e) {
            if (e instanceof SkillRoutingError) {
              return c.json({ error: e.message }, e.status);
            }
            throw e;
          }
          // Everything downstream reads the skill's name off the config.
          c.set('sa_config_pre_processed', {
            ...saConfig,
            skill_name: skill.name,
          });
        }

        c.set('agent', agent);
        c.set('skill', skill);

        // The first point at which a pending row could say which skill's logs
        // it belongs in, and still early enough to cover the provider call --
        // which is nearly all of a request's elapsed time.
        markRequestStarted(c);
      }
    }
    await next();

    if (learn) {
      const learning = learn().catch((e) => {
        warn('[SKILL_ROUTING] Could not learn from the request:', e);
      });
      if (getRuntimeKey() === 'workerd') {
        c.executionCtx.waitUntil(learning);
      }
    }
  },
);
