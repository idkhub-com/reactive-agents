import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import type { Skill } from '@shared/types/data';
import OpenAI from 'openai';
import type { ParsedChatCompletion } from 'openai/resources/chat/completions.mjs';
import z from 'zod';

const StructuredOutputResponse = z.object({
  system_prompt: z.string(),
});

type StructuredOutputResponse = z.infer<typeof StructuredOutputResponse>;

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

export async function generateSeedSystemPromptForSkill(skill: Skill) {
  // Check if OpenAI API key is available
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[OPTIMIZER] can't generate seed system prompt - No OPENAI_API_KEY found`,
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
    skill_name: 'system-prompt-seeding',
  };

  const systemPrompt = getSeederSystemPrompt();
  const firstMessage = getSeederFirstMessage(skill.description);

  const response: ParsedChatCompletion<StructuredOutputResponse> = await client
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
          name: 'system_prompt_generator',
          strict: true,
          schema: z.toJSONSchema(StructuredOutputResponse),
        },
      },
    });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't generate seed system prompt - No response found`,
    );
  }

  return structuredOutputResponse.system_prompt;
}

function getReflectorSystemPrompt() {
  const systemPrompt = `
You are an expert in generating system prompts for AI assistants.
Your task is to write a new instruction for the assistant and return it in a JSON object.`;

  return systemPrompt;
}

function getReflectorFirstMessage(
  currentSystemPrompt: string,
  examples: string[],
  agentDescription: string,
  skillDescription: string,
) {
  const firstMessage = `
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

I provided the assistant with the following instructions to perform this skill:

Current System Prompt:
'''
${currentSystemPrompt}
'''

The following are examples of different task inputs provided to the assistant
along with the assistant's response for each of them, and some feedback on how
the assistant's response could be better:

'''
${examples.join('\n\n---\n\n')}
'''

Your task is to write a new instruction for the assistant.

CONTEXT UNDERSTANDING:
First, carefully review the Agent Description and Skill Description above to understand the overall
purpose and specific task requirements. These descriptions define the core objectives that the
assistant must achieve.

Then, read the inputs carefully and identify the input format and infer detailed task
description about the task I wish to solve with the assistant.

IMPORTANT: Pay special attention to any "Request Constraints" sections in the examples above.
These constraints specify critical requirements such as:
- Response format (e.g., JSON schema, structured outputs)
- Available tools/functions the assistant can call
- Tool choice constraints (which tools must/can be used)
- Sampling parameters (temperature, max tokens)
- Reasoning effort requirements
- Stop sequences and other output constraints

If the examples include structured output requirements (response_format, text config, or JSON schemas),
make sure the new instruction explicitly guides the assistant on how to produce outputs that conform
to these schemas. Include specific guidance about required fields, data types, and output structure.

If the examples include tool/function definitions, ensure the instruction helps the assistant understand:
- When to use each tool
- How to construct proper tool call arguments
- What information is needed before calling a tool

Read all the assistant responses and the corresponding feedback. Identify all
niche and domain specific factual information about the task and include it in
the instruction, as a lot of it may not be available to the assistant in the
future. The assistant may have utilized a generalizable strategy to solve the
task, if so, include that in the instruction as well.

Return the new instruction in a JSON object.`;

  return firstMessage;
}

export async function generateReflectiveSystemPromptForSkill(
  currentSystemPrompt: string,
  examples: string[],
  agentDescription: string,
  skillDescription: string,
) {
  // Check if OpenAI API key is available
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `[OPTIMIZER] can't generate reflective system prompt - No OPENAI_API_KEY found`,
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
    skill_name: 'system-prompt-reflection',
  };

  const systemPrompt = getReflectorSystemPrompt();
  const firstMessage = getReflectorFirstMessage(
    currentSystemPrompt,
    examples,
    agentDescription,
    skillDescription,
  );

  const response: ParsedChatCompletion<StructuredOutputResponse> = await client
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
          name: 'system_prompt_generator',
          strict: true,
          schema: z.toJSONSchema(StructuredOutputResponse),
        },
      },
    });

  const structuredOutputResponse = response.choices[0].message.parsed;

  if (!structuredOutputResponse) {
    throw new Error(
      `[OPTIMIZER] can't generate reflective system prompt - No response found`,
    );
  }

  return structuredOutputResponse.system_prompt;
}
