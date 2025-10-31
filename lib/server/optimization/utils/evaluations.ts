import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import type { EvaluationMethodConnector } from '@server/types/connector';

import type { Skill } from '@shared/types/data';
import type { SkillOptimizationEvaluationCreateParams } from '@shared/types/data/skill-optimization-evaluation';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

function getSetupEvaluationSystemPrompt() {
  const systemPrompt =
    'You are an AI assistant in charge of training AI agents and evaluating their performance.';

  return systemPrompt;
}

function getSetupEvaluationFirstMessage(
  description: string,
  evaluationConnector: EvaluationMethodConnector,
) {
  const details = evaluationConnector.getDetails();
  const evaluationName = details.method;
  const evaluationDescription = details.description;

  const firstMessage = `
Given the following description of an AI agent:
${description}

Create the evaluation ${evaluationName} (${evaluationDescription}).

Set the evaluation method parameters so that we can evaluate the performance of the AI agent so that it can produce high-quality responses.
`;

  return firstMessage;
}

export async function generateEvaluationCreateParams(
  skill: Skill,
  evaluationConnector: EvaluationMethodConnector,
  method: EvaluationMethodName,
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
        model: 'gpt-5',
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
    skill.description,
    evaluationConnector,
  );

  const response: ParsedChatCompletion<typeof schema> = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .chat.completions.parse({
      model: 'gpt-5',
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
