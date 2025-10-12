import type { TaskCompletionEvaluationParameters } from '@server/connectors/evaluations/task-completion/types';
import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';

import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

const StructuredOutputResponse = z.object({
  task: z.string(),
  outcome: z.string(),
});

type StructuredOutputResponse = z.infer<typeof StructuredOutputResponse>;

function getSystemPrompt(task?: string) {
  const systemPrompt = `You are an expert at analyzing AI system interactions to extract task objectives and factual outcomes.

${task ? `The TASK: ${task}\n` : 'Your job is to analyze the provided input, tools used, and output to determine the task. What was the user trying to accomplish?\n'}
    
Your job is to analyze the provided input, tools used, and output to determine the outcome. What actually happened or was produced?

Be precise and factual. Focus on the concrete task and measurable outcome.`;

  return systemPrompt;
}

function getFirstMessage(input: string, output: string) {
  const firstMessage = `Analyze this interaction and extract the task and outcome:

INPUT:
${input}

ACTUAL OUTPUT:
${output}

Extract the TASK and OUTCOME from this interaction.`;

  return firstMessage;
}

export async function extractTaskAndOutcome(
  params: TaskCompletionEvaluationParameters,
  input: string,
  output: string,
) {
  // Check if OpenAI API key is available
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[OPTIMIZER] can't extract task and outcome - No OPENAI_API_KEY found`,
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
    agent_name: 'IdkHub',
    skill_name: 'extract-task-and-outcome',
  };

  const systemPrompt = getSystemPrompt(params.task);

  const firstMessage = getFirstMessage(input, output);

  const response: ParsedChatCompletion<StructuredOutputResponse> = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.parse({
      model: 'gpt-4o-mini',
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
          name: 'event',
          strict: true,
          schema: z.toJSONSchema(StructuredOutputResponse),
        },
      },
    });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't extract task and outcome - No response found`,
    );
  }

  return structuredOutputResponse;
}
