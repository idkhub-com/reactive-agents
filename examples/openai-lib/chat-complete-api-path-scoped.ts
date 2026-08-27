import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const AGENT_NAME = 'captain_code';
const SKILL_NAME = 'programming';

// The agent and the skill can be named in the base URL instead of in the
// `sa-config` header. From there on this is a plain OpenAI client: no per
// request headers needed.
const client = new OpenAI({
  // This is the API key to Super Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: `http://localhost:3000/v1/agents/${encodeURIComponent(AGENT_NAME)}/skills/${encodeURIComponent(SKILL_NAME)}`,
});

const userMessage1 = 'Are semicolons optional in JavaScript?';
logger.printWithHeader('User', userMessage1);

const response1 = await client.chat.completions.create({
  model: 'gpt-4o-mini', // The model value is ignored by Super Agents
  messages: [
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

const response2 = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
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

// The `sa-config` header is still available for everything else, such as
// system prompt variables. `agent_name` and `skill_name` in the header are
// ignored when the URL already names them.
const userMessage3 = 'What day is it today?';
logger.printWithHeader('User', userMessage3);

const response3 = await client
  .withOptions({
    defaultHeaders: {
      'sa-config': JSON.stringify({
        system_prompt_variables: {
          datetime: new Date().toISOString(),
        },
      }),
    },
  })
  .chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: userMessage3,
      },
    ],
  });

logger.printWithHeader('Agent', response3.choices[0].message.content || '');
