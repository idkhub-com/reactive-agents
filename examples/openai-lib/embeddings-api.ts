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
  skill_name: 'embeddings',
};

const inputText1 = 'Hello, world! This is a sample text for embedding.';
logger.printWithHeader('Input', inputText1);

// Note: The OpenAI library automatically truncates embeddings when `dimensions` is specified.
// For non-OpenAI providers (e.g., Google Gemini), use fetch directly to avoid incorrect truncation.
const response1 = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .embeddings.create({
    model: 'text-embedding-3-small',
    input: inputText1,
  });

const embedding1 = response1.data[0].embedding;
logger.printWithHeader(
  'Embedding Info',
  `Dimensions: ${embedding1.length}, First 5 values: [${embedding1.slice(0, 5).join(', ')}]`,
);
