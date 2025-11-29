import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import eventInputs from './data/structured-event-inputs.json';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calendar_event_planner',
  skill_name: 'describe',
};

// Number of random inputs to process
const N_INPUTS = 10;

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
  const eventData = selectedInputs[i];

  logger.printWithHeader(`Input ${i + 1}`, JSON.stringify(eventData, null, 2));

  const response = await client
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
          content: JSON.stringify(eventData),
        },
      ],
    });

  const agentResponse = response.output_text;
  logger.printWithHeader(`Response ${i + 1}`, agentResponse);

  // Add a small delay between requests to be respectful to the API
  if (i < selectedInputs.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
