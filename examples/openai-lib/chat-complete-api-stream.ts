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

const stream1 = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-4o-mini', // The model value is ignored by Reactive Agents
    messages: [
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    stream: true,
  });

let agentResponse1 = '';
process.stdout.write('Agent: ');
for await (const chunk of stream1) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
  agentResponse1 += content;
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
  .chat.completions.create({
    model: 'gpt-4o-mini', // The model value is ignored by Reactive Agents
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
    stream: true,
  });

process.stdout.write('Agent: ');
for await (const chunk of stream2) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
process.stdout.write('\n');
