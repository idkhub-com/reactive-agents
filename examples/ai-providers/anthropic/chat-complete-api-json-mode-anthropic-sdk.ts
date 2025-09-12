import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const client = new OpenAI({
  // This is the API key to IDKHub
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
  targets: [
    {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      api_key: process.env.ANTHROPIC_API_KEY,
    },
  ],
  agent_name: 'Calendar Event Planner',
  skill_name: 'Third Person View',
};

const _CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const userMessage = 'Alice and Bob are going to a science fair on Friday.';
logger.printWithHeader('User', userMessage);

const response = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'claude-3-haiku-20240307',
    messages: [
      {
        role: 'system',
        content: `Extract the event information from the user's message and return it as a JSON object with the following structure:
{
  "name": "string - name of the event",
  "date": "string - date of the event", 
  "participants": ["array of participant names"]
}

Return ONLY the JSON object, no additional text.`,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

const responseContent = response.choices[0]?.message?.content || '{}';
logger.printWithHeader('Raw Response', responseContent);

try {
  const agentResponse = JSON.parse(responseContent);
  logger.printWithHeader(
    'Parsed JSON Response',
    JSON.stringify(agentResponse, null, 2),
  );
} catch (error) {
  logger.error('Failed to parse response as JSON:', error);
  logger.printWithHeader('Response Content', responseContent);
}
