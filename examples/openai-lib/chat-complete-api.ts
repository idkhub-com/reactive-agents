import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'reactive-agents',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'captain_code',
  skill_name: 'programming',
};

const userMessage1 = 'Are semicolons optional in JavaScript?';
logger.printWithHeader('User', userMessage1);

const response1 = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: userMessage1,
      },
    ],
  });

const agentResponse1 = response1.choices[0].message.content;
logger.printWithHeader('Agent', agentResponse1 || '');

const userMessage2 = 'What about in Rust?';
logger.printWithHeader('User', userMessage2);

const response2 = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
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

logger.printWithHeader('Agent', response2.choices[0].message.content || '');
