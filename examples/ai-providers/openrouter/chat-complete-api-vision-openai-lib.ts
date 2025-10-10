import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

if (!process.env.OPENROUTER_API_KEY) {
  logger.error('OPENROUTER_API_KEY environment variable is required');
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
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini', // Vision-capable model
      api_key: process.env.OPENROUTER_API_KEY,
    },
  ],
  agent_name: 'Vision Assistant',
  skill_name: 'Image Analysis',
};

const userMessage = 'Analyze this image and describe what you see in detail.';
logger.printWithHeader('User', userMessage);

// Example using a public image URL
const imageUrl =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg';

// Extract the initial message content to avoid duplication
const initialMessageContent = [
  {
    type: 'text' as const,
    text: userMessage,
  },
  {
    type: 'image_url' as const,
    image_url: {
      url: imageUrl,
      detail: 'auto' as const,
    },
  },
];

const response = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: initialMessageContent,
      },
    ],
    max_tokens: 500,
  });

const initialResponse = response.choices?.[0]?.message?.content || '';
logger.printWithHeader('Agent', initialResponse);

// Example with follow-up question about the same image
const followUpMessage =
  'What would be the best time of day to visit this location for photography?';
logger.printWithHeader('User', followUpMessage);

const followUpResponse = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: initialMessageContent,
      },
      {
        role: 'assistant',
        content: response.choices[0]?.message?.content || '',
      },
      {
        role: 'user',
        content: followUpMessage,
      },
    ],
    max_tokens: 300,
  });

const followUpContent = followUpResponse.choices?.[0]?.message?.content || '';
logger.printWithHeader('Agent', followUpContent);
