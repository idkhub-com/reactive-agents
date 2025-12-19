import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import z from 'zod';

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
  .responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'event',
        schema: z.toJSONSchema(CalendarEvent),
      },
    },
  });

const agentResponse1 = response1.output_text;
logger.printWithHeader('Agent (JSON Response)', agentResponse1 || '');

// Parse and display the JSON response
try {
  const eventData = JSON.parse(agentResponse1 || '{}');
  logger.printWithHeader('Parsed JSON', JSON.stringify(eventData, null, 2));
} catch (error) {
  logger.error('Failed to parse JSON response:', error);
}
