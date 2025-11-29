import { OpenAI } from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calendar_event_planner',
  skill_name: 'generate',
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

const stream = client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .responses.stream({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    text: {
      format: zodTextFormat(CalendarEvent, 'event'),
    },
  })
  .on('response.refusal.delta', (event) => {
    process.stdout.write(event.delta);
  })
  .on('response.output_text.delta', (event) => {
    process.stdout.write(event.delta);
  })
  .on('response.output_text.done', () => {
    process.stdout.write('\n');
  })
  .on('error', (error) => {
    logger.error(error);
  });

const response1 = await stream.finalResponse();

const agentResponse = response1.output_parsed;
logger.printWithHeader('Agent Response', JSON.stringify(agentResponse));
