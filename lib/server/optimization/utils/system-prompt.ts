import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import type { Skill } from '@shared/types/data';
import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

const StructuredOutputResponse = z.object({
  system_prompt: z.string(),
});

type StructuredOutputResponse = z.infer<typeof StructuredOutputResponse>;

function getSystemPrompt() {
  const systemPrompt =
    'You are an AI assistant in charge of training AI agents to do specific tasks.';

  return systemPrompt;
}

function getFirstMessage(description: string) {
  const firstMessage = `
Given the following description of an AI agent, generate a system prompt for the AI agent so that it can produce high-quality responses:

${description}
`;

  return firstMessage;
}

export async function generateSystemPromptForSkill(skill: Skill) {
  // Check if OpenAI API key is available
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[OPTIMIZER] can't generate initial system prompt - No OPENAI_API_KEY found`,
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
    agent_name: 'IdkHub Optimizer Agent',
    skill_name: 'create-system-prompts',
  };

  const systemPrompt = getSystemPrompt();
  const firstMessage = getFirstMessage(skill.description);

  const response: ParsedChatCompletion<StructuredOutputResponse> = await client
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
          name: 'system_prompt_generator',
          strict: true,
          schema: z.toJSONSchema(StructuredOutputResponse),
        },
      },
    });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't generate initial system prompt - No response found`,
    );
  }

  return structuredOutputResponse.system_prompt;
}
