import type { TaskCompletionEvaluationParameters } from '@server/connectors/evaluations/task-completion/types';
import { API_URL, BEARER_TOKEN } from '@server/constants';
import type { UserDataStorageConnector } from '@server/types/connector';
import { resolveSystemSettingsModel } from '@server/utils/evaluation-model-resolver';
import { warn } from '@shared/console-logging';
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
  connector: UserDataStorageConnector,
) {
  // Resolve judge model from system settings for task extraction
  const modelConfig = await resolveSystemSettingsModel('judge', connector);

  if (!modelConfig) {
    warn('[OPTIMIZER] No judge model configured in system settings');
    throw new Error('No judge model configured in system settings');
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
    skill_name: 'extract-task-and-outcome',
  };

  const systemPrompt = getSystemPrompt(params.task);
  const firstMessage = getFirstMessage(input, output);

  const response: ParsedChatCompletion<StructuredOutputResponse> = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .chat.completions.parse({
      model: modelConfig.model,
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
