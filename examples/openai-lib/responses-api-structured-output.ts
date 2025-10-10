import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { makeParseableTextFormat } from 'openai/lib/parser.mjs';
import { type ZodType, z } from 'zod';

// Custom zodTextFormat to make it work with zod v4
export function zodTextFormat<ZodInput extends ZodType>(
  zodObject: ZodInput,
  name: string,
) {
  return makeParseableTextFormat(
    {
      type: 'json_schema',
      name,
      strict: true,
      schema: z.toJSONSchema(zodObject),
    },
    (content) => zodObject.parse(JSON.parse(content)),
  );
}

const client = new OpenAI({
  // This is the API key to IDKHub
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
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
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .responses.parse({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'Extract the event information.' },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    text: {
      // This is a custom zodTextFormat to make it work with zod v4
      format: zodTextFormat(CalendarEvent, 'event'),
    },
  });

const agentResponse = response1.output_parsed;
logger.printWithHeader('Agent Response', JSON.stringify(agentResponse));
