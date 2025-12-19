import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  agent_name: 'embedding_agent',
  skill_name: 'batch_embeddings',
};

const batchInputs = [
  'The quick brown fox jumps over the lazy dog.',
  'Machine learning is transforming the world.',
  'TypeScript provides type safety for JavaScript.',
];

logger.printWithHeader('Batch Inputs', batchInputs.join(' | '));

// Note: The OpenAI library automatically truncates embeddings when `dimensions` is specified.
// For non-OpenAI providers (e.g., Google Gemini), use fetch directly to avoid incorrect truncation.
const batchResponse = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .embeddings.create({
    model: 'text-embedding-3-small',
    input: batchInputs,
  });

logger.printWithHeader(
  'Batch Results',
  `Created ${batchResponse.data.length} embeddings, Usage: ${JSON.stringify(batchResponse.usage)}`,
);
