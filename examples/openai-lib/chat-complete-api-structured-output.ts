import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  agent_name: 'calendar_event_planner',
  // You can use the following description for the agent: "Plan calendar events for a user"
  skill_name: 'generate',
  // You can use the following description for the skill: "Generate a calendar event JSON object from plain text"
  system_prompt_variables: {
    datetime: new Date().toISOString(),
  },
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
  .chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    // This is a custom zodTextFormat to make it work with zod v4
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'event',
        strict: true,
        schema: z.toJSONSchema(CalendarEvent),
      },
    },
  });

const agentResponse = response1.choices[0].message.parsed;
logger.printWithHeader('Agent Response', JSON.stringify(agentResponse));
