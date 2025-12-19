import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  agent_name: 'captain_code',
  skill_name: 'programming',
};

const userMessage1 = 'Are semicolons optional in JavaScript?';
logger.printWithHeader('User', userMessage1);

const stream = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    stream: true,
  });

let agentResponse1 = '';
logger.printWithHeader('Agent', '');
for await (const event of stream) {
  if (event.type === 'response.output_text.delta') {
    process.stdout.write(event.delta);
    agentResponse1 += event.delta;
  }
}
process.stdout.write('\n');

const userMessage2 = 'What about in Rust?';
logger.printWithHeader('User', userMessage2);

const stream2 = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .responses.create({
    model: 'gpt-4o-mini',
    input: [
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
    stream: true,
  });

logger.printWithHeader('Agent', '');

for await (const event of stream2) {
  if (event.type === 'response.output_text.delta') {
    process.stdout.write(event.delta);
  }
}
process.stdout.write('\n');
