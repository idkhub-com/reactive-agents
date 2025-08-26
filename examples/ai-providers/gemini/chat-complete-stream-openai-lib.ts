import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to IDKHub
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
  targets: [
    {
      provider: 'google',
      model: 'gemini-2.5-flash',
      api_key: process.env.GEMINI_API_KEY,
    },
  ],
  agent_name: 'Captain Code',
  skill_name: 'JavaScript',
};

const userMessage1 = 'Are semicolons optional in JavaScript?';
logger.printWithHeader('User', userMessage1);

const stream1 = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'gemini-2.5-flash',
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
    stream: true,
  });

logger.printWithHeader('Agent', '');
for await (const event of stream1) {
  logger.log(event);
}
