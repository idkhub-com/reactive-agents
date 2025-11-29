import OpenAI from 'openai';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '@shared/console-logging';
import { makeParseableTextFormat } from 'openai/lib/parser.mjs';
import { type ZodType, z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Load event inputs from JSON file
const eventInputsPath = join(__dirname, 'data', 'event-inputs.json');
const eventInputs: string[] = JSON.parse(
  readFileSync(eventInputsPath, 'utf-8'),
);

// Number of random inputs to process
const N_INPUTS = 200;

// Function to get random elements from array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get random inputs to process
const selectedInputs = getRandomElements(eventInputs, N_INPUTS);

logger.printWithHeader('Processing', `${N_INPUTS} random event inputs`);

// Process each selected input
for (let i = 0; i < selectedInputs.length; i++) {
  const userMessage = selectedInputs[i];

  logger.printWithHeader(`Input ${i + 1}`, userMessage);

  const response = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .responses.parse({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      text: {
        // This is a custom zodTextFormat to make it work with zod v4
        format: zodTextFormat(CalendarEvent, 'event'),
      },
    });

  const agentResponse = response.output_parsed;
  logger.printWithHeader(
    `Response ${i + 1}`,
    JSON.stringify(agentResponse, null, 2),
  );

  // Add a small delay between requests to be respectful to the API
  if (i < selectedInputs.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
