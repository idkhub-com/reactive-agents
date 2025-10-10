import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
  targets: [
    {
      provider: 'anthropic',
      model: 'claude-opus-4-1',
      api_key: process.env.ANTHROPIC_API_KEY,
    },
  ],
  agent_name: 'Captain Code',
  skill_name: 'JavaScript',
};

async function runChatExample(): Promise<void> {
  try {
    const userMessage1 = 'Are semicolons optional in JavaScript?';
    logger.printWithHeader('User', userMessage1);

    const response1 = await client
      .withOptions({
        defaultHeaders: {
          'x-idk-config': JSON.stringify(idkhubConfig),
        },
      })
      .chat.completions.create({
        model: 'claude-opus-4-1',
        messages: [
          {
            role: 'system',
            content: 'You are a coding assistant that talks like a pirate',
          },
          {
            role: 'user',
            content: userMessage1,
          },
        ],
      });

    const agentResponse1 = response1.choices[0]?.message?.content;
    if (!agentResponse1) {
      throw new Error('No response received from the agent');
    }
    logger.printWithHeader('Agent', agentResponse1);

    const userMessage2 = 'What about in Rust?';
    logger.printWithHeader('User', userMessage2);

    const response2 = await client
      .withOptions({
        defaultHeaders: {
          'x-idk-config': JSON.stringify(idkhubConfig),
        },
      })
      .chat.completions.create({
        model: 'claude-opus-4-1',
        messages: [
          {
            role: 'system',
            content: 'You are a coding assistant that talks like a pirate',
          },
          {
            role: 'user',
            content: userMessage1,
          },
          {
            role: 'assistant',
            content: agentResponse1,
          },
          {
            role: 'user',
            content: userMessage2,
          },
        ],
      });

    const agentResponse2 = response2.choices[0]?.message?.content;
    if (!agentResponse2) {
      throw new Error('No response received from the agent for second message');
    }
    logger.printWithHeader('Agent', agentResponse2);
  } catch (error) {
    logger.error('Error in chat example:', error);
    throw error;
  }
}

// Run the example
runChatExample().catch((error) => {
  logger.error('Failed to run chat example:', error);
  process.exit(1);
});
