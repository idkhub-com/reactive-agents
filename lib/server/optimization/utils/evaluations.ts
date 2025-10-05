import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import type { EvaluationMethodConnector } from '@server/types/connector';
import { debug, json } from '@shared/console-logging';
import type { Skill } from '@shared/types/data';
import type { SkillOptimizationEvaluationCreateParams } from '@shared/types/data/skill-optimization-evaluation';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

const ListOfMethodsStructuredOutputResponse = z.object({
  suggested_methods: z.array(z.enum(EvaluationMethodName)),
});

type ListOfMethodsStructuredOutputResponse = z.infer<
  typeof ListOfMethodsStructuredOutputResponse
>;

function getListOfMethodsSystemPrompt() {
  const systemPrompt =
    'You are an AI assistant in charge of training AI agents and evaluating their performance.';

  return systemPrompt;
}

function getListOfMethodsFirstMessage(
  description: string,
  evaluationMethodsMap: Record<EvaluationMethodName, EvaluationMethodConnector>,
) {
  let connectorsString = '';
  for (const connector of Object.values(evaluationMethodsMap)) {
    const details = connector.getDetails();
    connectorsString += `- ${details.method}: ${details.description}\n`;
  }

  const firstMessage = `
Given the following description of an AI agent, return 2 evaluations that should be used to evaluate the performance of the AI agent so that it can produce high-quality responses:
${description}

The list of evaluation connectors available are:
${connectorsString}
`;

  return firstMessage;
}

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

export async function generateEvaluationsCreateParamsListForSkill(
  skill: Skill,
  evaluationMethodsMap: Record<EvaluationMethodName, EvaluationMethodConnector>,
): Promise<SkillOptimizationEvaluationCreateParams[]> {
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

  const idkhubConfig = {
    targets: [
      {
        provider: 'openai',
        model: 'gpt-5',
        api_key: apiKey,
      },
    ],
    agent_name: 'idk',
    skill_name: 'create-evaluations',
  };

  const systemPrompt = getListOfMethodsSystemPrompt();
  const firstMessage = getListOfMethodsFirstMessage(
    skill.description,
    evaluationMethodsMap,
  );

  const response: ParsedChatCompletion<ListOfMethodsStructuredOutputResponse> =
    await client
      .withOptions({
        defaultHeaders: {
          'x-idk-config': JSON.stringify(idkhubConfig),
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
            name: 'evaluations',
            strict: true,
            schema: z.toJSONSchema(ListOfMethodsStructuredOutputResponse),
          },
        },
      });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't generate evaluations for skill - No response found`,
    );
  }

  const { suggested_methods } = structuredOutputResponse;

  debug(`[OPTIMIZER] suggested methods: ${suggested_methods.join(', ')}`);

  const evaluationsCreateParamsList: SkillOptimizationEvaluationCreateParams[] =
    [];
  for (const method of suggested_methods) {
    const connector = evaluationMethodsMap[method];
    if (!connector) {
      continue;
    }
    const schema = connector.getParameterSchema;

    const jsonSchema = z.toJSONSchema(schema);

    debug(`Getting JSON Schema for ${method}`);
    json(jsonSchema);

    const systemPrompt = getSetupEvaluationSystemPrompt();
    const firstMessage = getSetupEvaluationFirstMessage(
      skill.description,
      connector,
    );
    const response: ParsedChatCompletion<typeof schema> = await client
      .withOptions({
        defaultHeaders: {
          'x-idk-config': JSON.stringify(idkhubConfig),
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

    debug('After completion');

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
      metadata: structuredOutputResponse as unknown as Record<string, unknown>,
    };

    evaluationsCreateParamsList.push(params);
  }

  return evaluationsCreateParamsList;
}
