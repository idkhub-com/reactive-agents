import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

if (!process.env.XAI_API_KEY) {
  logger.error('XAI_API_KEY environment variable is required');
  process.exit(1);
}

const client = new OpenAI({
  // This is the API key to IDKHub
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
  agent_name: 'Captain Code',
  skill_name: 'JavaScript',
  targets: [
    {
      configuration_name: 'Main',
      system_prompt_variables: {
        persona: 'cat',
      },
      api_key: process.env.XAI_API_KEY,
    },
  ],
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
    model: 'grok-4',
    messages: [
      {
        role: 'system',
        content:
          "This message is not necessary. It will be overridden by the skill's configuration.",
      },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
  });

const agentResponse1 = response1.choices[0].message.content || '';
logger.printWithHeader('Agent', agentResponse1);
