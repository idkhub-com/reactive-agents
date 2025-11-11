import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import type { EvaluationMethodConnector } from '@server/types/connector';

import type { Skill } from '@shared/types/data';
import type { SkillOptimizationEvaluationCreateParams } from '@shared/types/data/skill-optimization-evaluation';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

function getSetupEvaluationSystemPrompt() {
  const systemPrompt = `You are an AI assistant that configures evaluation methods for AI agent training systems.

Your role is to generate evaluation METHOD PARAMETERS, not to create evaluation prompts or judge agents yourself.

The evaluation system has two stages:
1. EXTRACTION: An AI extracts the "task" and "outcome" from each request/response
2. VERDICT: An AI judges if the outcome matches the task

You are configuring WHAT TASK to extract (stage 1), not creating the judge (stage 2).`;

  return systemPrompt;
}

function getSetupEvaluationFirstMessage(
  agentDescription: string,
  skillDescription: string,
  evaluationConnector: EvaluationMethodConnector,
  examples?: string[],
) {
  const details = evaluationConnector.getDetails();
  const evaluationName = details.method;
  const evaluationDescription = details.description;

  let firstMessage = `
I am building an AI agent with the following purpose:

Agent Description:
'''
${agentDescription}
'''

This agent has a specific skill that it needs to perform:

Skill Description:
'''
${skillDescription}
'''

Configure the evaluation method: ${evaluationName} (${evaluationDescription}).

Your task: Generate parameters that define WHAT TASK the extraction AI should look for in request/response pairs.

IMPORTANT: You are NOT creating judge prompts or evaluation criteria. You are defining:
- The "task" field: A clear, concise description of what task the AI agent is trying to accomplish
  Example: "Generate a calendar event JSON object from plain text with only real participant names"

This task description will be used by a separate extraction AI to identify what the user was trying to accomplish in each request.

Focus on being specific and actionable. The task should be something measurable and observable in the agent's outputs.
`;

  // If we have examples from actual requests, include them
  if (examples && examples.length > 0) {
    firstMessage += `

CONTEXT: Below are examples of actual requests and responses from this skill in production.

'''
${examples.join('\n\n---\n\n')}
'''

Based on these examples, refine your task description to be:
1. SPECIFIC to what you observe the agent doing (e.g., "Generate JSON with fields X, Y, Z" not just "Generate JSON")
2. CLEAR about any constraints or requirements (e.g., "Only use real person names" if you see that pattern)
3. FOCUSED on the core deliverable (what the user actually receives)

Pay attention to:
- Any "Request Constraints" sections showing JSON schemas, tools, or output formats
- Patterns in what the agent produces (structured data formats, specific fields, constraints)
- Consistent requirements across multiple examples

Your task description will guide the extraction AI to understand what users are asking for.
`;
  }

  return firstMessage;
}

export async function generateEvaluationCreateParams(
  skill: Skill,
  evaluationConnector: EvaluationMethodConnector,
  method: EvaluationMethodName,
  agentDescription: string,
  examples?: string[],
): Promise<SkillOptimizationEvaluationCreateParams> {
  // Check if OpenAI API key is available
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[OPTIMIZER] can't generate evaluations for skill - No OPENAI_API_KEY found`,
    );
  }

  const client = new OpenAI({
    apiKey: BEARER_TOKEN,
    baseURL: `${API_URL}/v1`,
  });

  const raConfig = {
    targets: [
      {
        provider: 'openai',
        model: 'gpt-5-mini',
        api_key: apiKey,
      },
    ],
    agent_name: 'reactive-agents',
    skill_name: 'create-evaluations',
  };

  const schema = evaluationConnector.getParameterSchema;

  const jsonSchema = z.toJSONSchema(schema);

  const systemPrompt = getSetupEvaluationSystemPrompt();
  const firstMessage = getSetupEvaluationFirstMessage(
    agentDescription,
    skill.description,
    evaluationConnector,
    examples,
  );

  const response: ParsedChatCompletion<typeof schema> = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: firstMessage,
        },
      ],
      // This is a custom zodTextFormat to make it work with zod v4
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'params',
          strict: true,
          schema: jsonSchema,
        },
      },
    });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't generate evaluations for skill - No response found`,
    );
  }

  const params: SkillOptimizationEvaluationCreateParams = {
    agent_id: skill.agent_id,
    skill_id: skill.id,
    evaluation_method: method,
    params: structuredOutputResponse as unknown as Record<string, unknown>,
  };

  return params;
}

/**
 * Regenerates evaluations for a skill using real request examples.
 * This should be called after the skill has been used in production to create
 * evaluations that are better aligned with actual usage patterns.
 */
export async function regenerateEvaluationsWithExamples(
  skill: Skill,
  agentDescription: string,
  examples: string[],
  evaluationConnectors: Record<string, EvaluationMethodConnector>,
  existingEvaluationMethods: EvaluationMethodName[],
): Promise<SkillOptimizationEvaluationCreateParams[]> {
  const regeneratePromises = existingEvaluationMethods.map(async (method) => {
    const evaluationConnector = evaluationConnectors[method];
    if (!evaluationConnector) {
      throw new Error(`Evaluation connector not found for method ${method}`);
    }

    return await generateEvaluationCreateParams(
      skill,
      evaluationConnector,
      method,
      agentDescription,
      examples,
    );
  });

  return await Promise.all(regeneratePromises);
}
