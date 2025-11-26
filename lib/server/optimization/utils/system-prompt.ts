import { API_URL, BEARER_TOKEN } from '@server/constants';
import type { UserDataStorageConnector } from '@server/types/connector';
import { resolveSystemSettingsModel } from '@server/utils/evaluation-model-resolver';
import { warn } from '@shared/console-logging';
import type { Skill } from '@shared/types/data';
import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

const StructuredOutputResponse = z.object({
  system_prompt: z.string(),
});

type StructuredOutputResponse = z.infer<typeof StructuredOutputResponse>;

/**
 * Shared function to generate the template variables section for prompts.
 * Only returns content if variables are provided (assumes user defined them for a reason).
 */
function getTemplateVariablesSection(
  allowedTemplateVariables?: string[],
): string {
  if (!allowedTemplateVariables || allowedTemplateVariables.length === 0) {
    return '';
  }

  return `

**Template Variables:**
You MUST use template variables in the system prompt using double curly braces.
Required variables:
${allowedTemplateVariables.map((v) => `- {{ ${v} }}`).join('\n')}

These variables will be provided by the user at runtime via system_prompt_variables.`;
}

/**
 * Shared function to generate the response format section for prompts.
 */
function getResponseFormatSection(responseFormat?: unknown): string {
  if (!responseFormat) {
    return '';
  }

  return `

CRITICAL: This agent must produce output conforming to the following JSON schema:

${JSON.stringify(responseFormat, null, 2)}

The system prompt MUST be designed around this schema. Include explicit instructions for every required field, specify exact data types and formats, explain constraints, and guide the assistant on how to structure its output to match this schema perfectly.`;
}

/**
 * Shared function to generate the examples section for prompts.
 */
function getExamplesSection(examples: string[]): string {
  if (examples.length === 0) {
    return '';
  }

  return `

Here are real examples of inputs and outputs to inform the system prompt:

${examples.join('\n\n---\n\n')}

Analyze these examples to understand the task better and incorporate any patterns or domain-specific knowledge into the system prompt.`;
}

/**
 * Shared function to create and configure OpenAI client for system prompt generation.
 */
async function createSystemPromptClient(
  skillName: string,
  connector: UserDataStorageConnector,
) {
  // Resolve system prompt reflection model from system settings
  const modelConfig = await resolveSystemSettingsModel(
    'system_prompt_reflection',
    connector,
  );

  if (!modelConfig) {
    warn(
      '[OPTIMIZER] No system prompt reflection model configured in system settings',
    );
    throw new Error(
      'No system prompt reflection model configured in system settings',
    );
  }

  const client = new OpenAI({
    apiKey: BEARER_TOKEN,
    baseURL: `${API_URL}/v1`,
  });

  const raConfig = {
    targets: [
      {
        provider: modelConfig.provider,
        model: modelConfig.model,
        api_key: modelConfig.apiKey,
      },
    ],
    agent_name: 'reactive-agents',
    skill_name: skillName,
  };

  return { client, raConfig, model: modelConfig.model };
}

/**
 * Shared function to call OpenAI with structured output for system prompt generation.
 */
async function callSystemPromptAPI(
  client: OpenAI,
  raConfig: unknown,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const response: ParsedChatCompletion<StructuredOutputResponse> = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'system_prompt_generator',
          strict: true,
          schema: z.toJSONSchema(StructuredOutputResponse),
        },
      },
    });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't generate system prompt - No response found`,
    );
  }

  return structuredOutputResponse.system_prompt;
}

function getSeederSystemPrompt() {
  const systemPrompt =
    'You are an AI assistant in charge of training AI agents to do specific tasks.';

  return systemPrompt;
}

function getSeederFirstMessage(description: string) {
  const firstMessage = `
Given the following description of an AI agent, generate a system prompt for the AI agent so that it can produce high-quality responses:

${description}
`;

  return firstMessage;
}

function getSeederWithContextFirstMessage(
  agentDescription: string,
  skillDescription: string,
  examples: string[],
  responseFormat?: unknown,
  allowedTemplateVariables?: string[],
) {
  const responseFormatSection = getResponseFormatSection(responseFormat);
  const examplesSection = getExamplesSection(examples);
  const templateVariablesSection = getTemplateVariablesSection(
    allowedTemplateVariables,
  );

  const firstMessage = `
I am building an AI agent with the following purpose:

Agent Description:
${agentDescription}

The agent has a specific skill it needs to perform:

Skill Description:
${skillDescription}
${responseFormatSection}
${examplesSection}
${templateVariablesSection}

Generate a comprehensive system prompt that will enable the assistant to perform this skill effectively. The system prompt should be clear, detailed, and actionable.

Return the system prompt in a JSON object.`;

  return firstMessage;
}

export async function generateSeedSystemPromptForSkill(
  skill: Skill,
  connector: UserDataStorageConnector,
) {
  const { client, raConfig, model } = await createSystemPromptClient(
    'system-prompt-seeding',
    connector,
  );

  const systemPrompt = getSeederSystemPrompt();
  const userMessage = getSeederFirstMessage(skill.description);

  return await callSystemPromptAPI(
    client,
    raConfig,
    model,
    systemPrompt,
    userMessage,
  );
}

export async function generateSeedSystemPromptWithContext(
  agentDescription: string,
  skillDescription: string,
  examples: string[],
  connector: UserDataStorageConnector,
  responseFormat?: unknown,
  allowedTemplateVariables?: string[],
) {
  const { client, raConfig, model } = await createSystemPromptClient(
    'system-prompt-seeding-with-context',
    connector,
  );

  const systemPrompt = getSeederSystemPrompt();
  const userMessage = getSeederWithContextFirstMessage(
    agentDescription,
    skillDescription,
    examples,
    responseFormat,
    allowedTemplateVariables,
  );

  return await callSystemPromptAPI(
    client,
    raConfig,
    model,
    systemPrompt,
    userMessage,
  );
}

function getReflectorSystemPrompt() {
  const systemPrompt = `You are an expert at refining AI system prompts based on performance feedback. You will receive:
1. The current system prompt
2. The best example it ever produced (what to preserve)
3. Recent failures with evaluation results explaining what went wrong (what to fix)

Your task: Generate an improved system prompt that maintains the strengths while fixing the specific issues identified in the evaluation feedback.`;

  return systemPrompt;
}

function getReflectorFirstMessage(
  currentSystemPrompt: string,
  bestExamples: string[],
  worstExamples: string[],
  agentDescription: string,
  skillDescription: string,
  allowedTemplateVariables: string[],
) {
  const firstMessage = `# Context

Agent: ${agentDescription}
Skill: ${skillDescription}

# Current System Prompt
'''
${currentSystemPrompt}
'''

# Performance Analysis

## Best Example (Peak Performance - Preserve These Qualities)
'''
${bestExamples.join('\n\n---\n\n')}
'''

## Recent Failures (Fix These Issues)

Each failure below includes evaluation results that explain exactly what went wrong. Use this feedback to identify and fix specific problems.

'''
${worstExamples.join('\n\n---\n\n')}
'''

# Instructions

Generate an improved system prompt that:
1. **Preserves** the qualities that led to the best example
2. **Fixes** the specific issues identified in the evaluation results
3. **Handles** any "Request Constraints" (JSON schemas, tools, etc.) shown in the examples

Key points:
- If examples show structured output (response_format), design the prompt around that schema
- Include explicit instructions for every required field, data type, and constraint
- Extract and include any domain-specific knowledge or strategies from the examples
- Make the prompt clear, actionable, and focused on the actual task requirements
${getTemplateVariablesSection(allowedTemplateVariables)}

Return the new system prompt as JSON.`;

  return firstMessage;
}

export async function generateReflectiveSystemPromptForSkill(
  currentSystemPrompt: string,
  bestExamples: string[],
  worstExamples: string[],
  agentDescription: string,
  skillDescription: string,
  allowedTemplateVariables: string[],
  connector: UserDataStorageConnector,
) {
  const { client, raConfig, model } = await createSystemPromptClient(
    'system-prompt-reflection',
    connector,
  );

  const systemPrompt = getReflectorSystemPrompt();
  const userMessage = getReflectorFirstMessage(
    currentSystemPrompt,
    bestExamples,
    worstExamples,
    agentDescription,
    skillDescription,
    allowedTemplateVariables,
  );

  return await callSystemPromptAPI(
    client,
    raConfig,
    model,
    systemPrompt,
    userMessage,
  );
}
