import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

if (!process.env.OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY environment variable is required');
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
      provider: 'openai',
      model: 'text-embedding-3-small',
      api_key: process.env.OPENAI_API_KEY,
    },
  ],
  agent_name: 'OpenAI Embeddings Agent',
  skill_name: 'Batch Embeddings',
};

const batchInputs = [
  'The quick brown fox jumps over the lazy dog.',
  'Machine learning is transforming the world.',
  'TypeScript provides type safety for JavaScript.',
];

logger.printWithHeader('Batch Inputs', batchInputs.join(' | '));

const batchResponse = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
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
