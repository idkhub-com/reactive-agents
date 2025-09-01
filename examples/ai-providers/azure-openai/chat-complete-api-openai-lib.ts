import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

if (!process.env.AZURE_OPENAI_API_KEY) {
  logger.error('AZURE_OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

if (!process.env.AZURE_OPENAI_URL) {
  logger.error('AZURE_OPENAI_URL environment variable is required');
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
      provider: 'azure-openai',
      model: 'gpt-5-mini',
      api_key: process.env.AZURE_OPENAI_API_KEY,
      azure_openai_config: {
        url: process.env.AZURE_OPENAI_URL,
      },
    },
  ],
  agent_name: 'Captain Code',
  skill_name: 'JavaScript',
};

const userMessage1 = 'Are semicolons optional in JavaScript?';
logger.printWithHeader('User', userMessage1);

const response1 = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a coding assistant that talks like a pirate',
      },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
  });

const agentResponse1 = response1.choices[0].message.content;
logger.printWithHeader('Agent', agentResponse1 || '');

const userMessage2 = 'What about in Rust?';
logger.printWithHeader('User', userMessage2);

const response2 = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a coding assistant that talks like a pirate',
      },
      {
        role: 'user',
        content: userMessage1,
      },
      {
        role: 'assistant',
        content: agentResponse1,
      },
      {
        role: 'user',
        content: userMessage2,
      },
    ],
  });

logger.printWithHeader('Agent', response2.choices[0].message.content || '');
