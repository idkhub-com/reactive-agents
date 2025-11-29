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
  targets: [{ optimization: 'auto' }],
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

logger.printWithHeader('Agent (JSON Response - Streaming)', '');

const stream1 = client
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
      format: {
        type: 'json_schema',
        name: 'event',
        schema: z.toJSONSchema(CalendarEvent),
      },
    },
  })
  .on('response.output_text.delta', (event) => {
    process.stdout.write(event.delta);
  })
  .on('error', (error) => {
    logger.error(error);
  });

const response1 = await stream1.finalResponse();

console.log(); // New line after streaming

const agentResponse1 = response1.output_text;

// Parse and display the JSON response
if (agentResponse1) {
  try {
    const eventData = JSON.parse(agentResponse1);
    logger.printWithHeader('Parsed JSON', JSON.stringify(eventData, null, 2));
  } catch (error) {
    logger.error('Failed to parse JSON response:', error);
  }
} else {
  logger.printWithHeader('Note', 'JSON was streamed above');
}
