import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

if (!process.env.AZURE_AI_FOUNDRY_API_KEY) {
  logger.error('AZURE_AI_FOUNDRY_API_KEY environment variable is required');
  process.exit(1);
}

if (!process.env.AZURE_AI_FOUNDRY_URL) {
  logger.error('AZURE_AI_FOUNDRY_URL environment variable is required');
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
      provider: 'azure-ai-foundry',
      model: 'DeepSeek-R1-0528',
      api_key: process.env.AZURE_AI_FOUNDRY_API_KEY,
      azure_ai_foundry_config: {
        url: process.env.AZURE_AI_FOUNDRY_URL,
      },
    },
  ],
  agent_name: 'Calendar Event Planner',
  skill_name: 'Third Person View',
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
  .chat.completions.create({
    model: 'DeepSeek-R1-0528',
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
