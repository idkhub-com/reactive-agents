import { getApiUrl } from '@api/constants';
import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { resolveSystemSettingsModel } from '@api/utils/evaluation-model-resolver';
import { warn } from '@shared/console-logging';
import type { Agent, Skill } from '@shared/types/data';
import type { RequestIntent } from '@shared/utils/request-intent';
import OpenAI from 'openai';
import { z } from 'zod';

/**
 * What the arbiter decides about a request no skill matched closely:
 * it belongs to an existing skill after all, it is a new kind of job, or
 * the arbiter could not be asked and the caller should route conservatively.
 */
export type SkillArbiterVerdict =
  | { kind: 'existing'; skill: Skill }
  | { kind: 'new' }
  | { kind: 'unavailable' };

const ArbiterAnswer = z.object({
  /** The name of the skill the request belongs to, or null for a new job.
   * The null branch comes first: a provider that answers a union with its
   * first branch (the e2e stub does) then lands on "new job", which keeps
   * the whole no-skill-matches path -- creation included -- observable
   * end to end. */
  skill_name: z.union([z.null(), z.string()]),
});

/** One attempt; the client retries once. Bounded so that arbitration plus
 * skill creation still finish inside the creation lease. */
const ARBITER_TIMEOUT_MS = 15_000;

const PROMPT_EXCERPT = 1500;
const CONVERSATION_EXCERPT = 1500;
const DESCRIPTION_EXCERPT = 300;

const ARBITER_SYSTEM_PROMPT = `You route requests for an AI gateway agent. The agent has skills, and each skill is one kind of job. A new request resembles none of them closely, and you decide what that means.

The distinction that matters: a skill's requests often carry wildly different subject matter while remaining the same job -- a summarizer summarizes anything, a title generator titles any conversation. That is the same skill. A new job is different work: a different kind of instruction, a different role, a different deliverable.

Reply with a JSON object: {"skill_name": "<name>"} when the request is one of the listed skills' jobs on different material, or {"skill_name": null} when it is a job the agent has no skill for yet.`;

function arbiterUserMessage(
  agent: Agent,
  skills: Skill[],
  intent: RequestIntent,
): string {
  const listed = skills
    .map(
      (skill) =>
        `- ${skill.name}: ${skill.description.slice(0, DESCRIPTION_EXCERPT)}`,
    )
    .join('\n');
  const sections = [
    `The agent is described as:\n\n${agent.description}`,
    `Its skills:\n\n${listed}`,
  ];
  if (intent.systemPrompt || intent.tools) {
    const identity = [
      intent.systemPrompt?.slice(0, PROMPT_EXCERPT),
      intent.tools,
    ]
      .filter(Boolean)
      .join('\n\n');
    sections.push(`The request carries these instructions:\n\n${identity}`);
  }
  if (intent.conversation) {
    sections.push(
      `The conversation so far:\n\n${intent.conversation.slice(0, CONVERSATION_EXCERPT)}`,
    );
  }
  return sections.join('\n\n');
}

/**
 * Asks a model whether a request that matched no skill closely is really one
 * of them -- the same job on different subject matter -- or a new kind of job.
 *
 * Embeddings cannot make this call: measured on real traffic, a genuinely new
 * task through a familiar tool and familiar work on unfamiliar material land
 * at the same distance. So below the threshold, this is the tiebreak. Runs
 * through the internal `route-or-create` skill like the other generation
 * steps. Anything going wrong answers `unavailable`, and the caller routes to
 * the closest skill rather than creating one -- the conservative side.
 */
export async function arbitrateSkillForRequest(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  skills: Skill[],
  intent: RequestIntent,
): Promise<SkillArbiterVerdict> {
  try {
    const modelConfig = await resolveSystemSettingsModel(
      c,
      'system_prompt_reflection',
      connector,
    );
    if (!modelConfig) {
      warn(
        '[SKILL_ROUTING] No system prompt reflection model configured; routing to the closest skill without arbitration',
      );
      return { kind: 'unavailable' };
    }

    const client = new OpenAI({
      apiKey: '',
      baseURL: `${getApiUrl(c)}/v1`,
      timeout: ARBITER_TIMEOUT_MS,
      maxRetries: 1,
    });
    const saConfig = {
      targets: [
        {
          provider: modelConfig.provider,
          model: modelConfig.model,
          ...(modelConfig.apiKey ? { api_key: modelConfig.apiKey } : {}),
          ...(modelConfig.customHost
            ? { custom_host: modelConfig.customHost }
            : {}),
        },
      ],
      agent_name: 'super-agents',
      skill_name: 'route-or-create',
    };

    const response = await client
      .withOptions({
        defaultHeaders: { 'sa-config': JSON.stringify(saConfig) },
      })
      .chat.completions.parse({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: ARBITER_SYSTEM_PROMPT },
          { role: 'user', content: arbiterUserMessage(agent, skills, intent) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'skill_routing_verdict',
            strict: true,
            schema: z.toJSONSchema(ArbiterAnswer),
          },
        },
      });

    // Only a provider that enforces `response_format` guarantees the shape.
    const parsed = ArbiterAnswer.safeParse(response.choices[0]?.message.parsed);
    if (!parsed.success) {
      warn(
        '[SKILL_ROUTING] The arbiter did not answer in the expected shape; routing to the closest skill',
      );
      return { kind: 'unavailable' };
    }
    if (parsed.data.skill_name === null) {
      return { kind: 'new' };
    }
    const chosen = skills.find(
      (skill) => skill.name === parsed.data.skill_name,
    );
    if (!chosen) {
      warn(
        `[SKILL_ROUTING] The arbiter chose "${parsed.data.skill_name}", which is not one of the agent's skills; routing to the closest skill`,
      );
      return { kind: 'unavailable' };
    }
    return { kind: 'existing', skill: chosen };
  } catch (e) {
    warn(
      '[SKILL_ROUTING] Could not ask the arbiter; routing to the closest skill:',
      e instanceof Error ? e.message : e,
    );
    return { kind: 'unavailable' };
  }
}
