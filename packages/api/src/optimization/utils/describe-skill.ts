import { getApiUrl } from '@api/constants';
import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { resolveSystemSettingsModel } from '@api/utils/evaluation-model-resolver';
import { warn } from '@shared/console-logging';
import type { Agent } from '@shared/types/data';
import OpenAI from 'openai';
import { z } from 'zod';

/** What a skill the gateway creates is called and what it says it is for. */
export interface SkillNaming {
  name: string;
  description: string;
}

const SkillDescription = z.object({
  name: z.string(),
  description: z.string(),
});

const NAME_MAX_LENGTH = 40;
/** One attempt; the client retries once, so the whole call takes at most twice this. */
const DESCRIBE_TIMEOUT_MS = 15_000;
/** `SkillCreateParams` bounds. */
const DESCRIPTION_MIN_LENGTH = 25;
const DESCRIPTION_MAX_LENGTH = 10000;

const DESCRIBER_SYSTEM_PROMPT = `You name skills for an AI gateway. A skill is one job that clients send to an agent, identified by the system prompt and tools they send with it.

Given those, reply with a JSON object holding a short name and a description.
- The name is 3 to 40 characters of lowercase letters, digits and hyphens, and says what the job is, for example "summarize-support-tickets".
- The description is one to three sentences on what the job is and what a good response looks like, written so that an evaluator could judge responses against it. Describe the job; do not repeat the instructions.`;

/** Skill names are `^[a-z0-9_-]+$`, 3 to 100 characters. */
export function slugifySkillName(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, NAME_MAX_LENGTH)
    .replace(/-+$/, '');
  return slug.length >= 3 ? slug : 'skill';
}

/** `name`, or the first of `name-2`, `name-3`, ... the agent does not have. */
export function uniqueSkillName(base: string, taken: Iterable<string>): string {
  const names = new Set(taken);
  if (!names.has(base)) {
    return base;
  }
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, NAME_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!names.has(candidate)) {
      return candidate;
    }
  }
}

/**
 * A name and description from the request alone, for when no model can be
 * asked: the first words of the instructions, and the instructions quoted.
 */
export function heuristicSkillNaming(intent: string): SkillNaming {
  const firstLine =
    intent
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? '';
  const name = slugifySkillName(firstLine.split(/\s+/).slice(0, 5).join(' '));
  const description =
    `Created by the gateway for requests whose instructions begin: ${intent.slice(0, 500)}`.slice(
      0,
      DESCRIPTION_MAX_LENGTH,
    );
  return { name, description };
}

function describerUserMessage(
  agent: Agent,
  intent: string,
  takenNames: string[],
): string {
  const taken =
    takenNames.length > 0
      ? `\n\nThe agent already has skills named: ${takenNames.join(', ')}. Pick a name that is not one of them.`
      : '';
  return `The agent is described as:

${agent.description}

A client sent it a request with these instructions and tools:

${intent}${taken}`;
}

/**
 * Names and describes the skill a request should become.
 *
 * Asks the system-prompt reflection model through the internal
 * `describe-skill` skill, like the other generation steps. Anything that goes
 * wrong -- no model configured, the provider failing, an answer that does not
 * fit -- falls back to `heuristicSkillNaming`, because a request that has
 * reached this point still has to be served.
 */
export async function describeSkillForRequest(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  intent: string,
  takenNames: string[],
): Promise<SkillNaming> {
  const fallback = heuristicSkillNaming(intent);

  try {
    const modelConfig = await resolveSystemSettingsModel(
      c,
      'system_prompt_reflection',
      connector,
    );
    if (!modelConfig) {
      warn(
        '[SKILL_CREATION] No system prompt reflection model configured; naming the skill from the request alone',
      );
      return fallback;
    }

    // Bounded so that creating a skill finishes inside its lease
    // (`SKILL_CREATION_LEASE_MS`); a model that takes longer than this to
    // name a skill is not worth holding a request for.
    const client = new OpenAI({
      apiKey: '',
      baseURL: `${getApiUrl(c)}/v1`,
      timeout: DESCRIBE_TIMEOUT_MS,
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
      skill_name: 'describe-skill',
    };

    const response = await client
      .withOptions({
        defaultHeaders: { 'sa-config': JSON.stringify(saConfig) },
      })
      .chat.completions.parse({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: DESCRIBER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: describerUserMessage(agent, intent, takenNames),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'skill_description',
            strict: true,
            schema: z.toJSONSchema(SkillDescription),
          },
        },
      });

    // Only a provider that enforces `response_format` guarantees the shape.
    const parsed = SkillDescription.safeParse(
      response.choices[0]?.message.parsed,
    );
    if (!parsed.success) {
      warn(
        '[SKILL_CREATION] The model did not describe the skill in the expected shape; naming it from the request alone',
      );
      return fallback;
    }

    const name = slugifySkillName(parsed.data.name);
    const description = parsed.data.description.trim();
    return {
      name: name === 'skill' ? fallback.name : name,
      description:
        description.length >= DESCRIPTION_MIN_LENGTH
          ? description.slice(0, DESCRIPTION_MAX_LENGTH)
          : fallback.description,
    };
  } catch (e) {
    warn(
      '[SKILL_CREATION] Could not ask the model to describe the skill; naming it from the request alone:',
      e,
    );
    return fallback;
  }
}
