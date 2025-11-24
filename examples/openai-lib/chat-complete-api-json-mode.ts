import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'reactive-agents',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calendar_event_planner',
  skill_name: 'generate',
};

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const userMessage1 = 'Alice and Bob are going to a science fair on Friday.';
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
      { role: 'system', content: 'Extract the event information.' },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'event',
        strict: true,
        schema: z.toJSONSchema(CalendarEvent),
      },
    },
  });

const agentResponse = JSON.parse(
  response1.choices[0]?.message?.content || '{}',
);
logger.printWithHeader('Agent Response', JSON.stringify(agentResponse));
