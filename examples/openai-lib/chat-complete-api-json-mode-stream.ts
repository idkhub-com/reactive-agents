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
  agent_name: 'calendar_event_planner',
  skill_name: 'generate',
};

const userMessage1 = 'Alice and Bob are going to a science fair on Friday.';
logger.printWithHeader('User', userMessage1);

const stream = await client
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
    response_format: { type: 'json_object' },
    stream: true,
  });

let contentBuffer = '';
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  contentBuffer += content;
}

const agentResponse = JSON.parse(contentBuffer || '{}');
logger.printWithHeader('Agent Response', JSON.stringify(agentResponse));
