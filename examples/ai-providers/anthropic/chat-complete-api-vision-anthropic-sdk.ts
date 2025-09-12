import OpenAI from 'openai';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import logger from '@shared/console-logging';

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('ANTHROPIC_API_KEY environment variable is required');
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
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      api_key: process.env.ANTHROPIC_API_KEY,
    },
  ],
  agent_name: 'Vision Assistant',
  skill_name: 'Image Analysis',
};

// Function to encode image to base64
function encodeImageToBase64(imagePath: string): string {
  const imageBuffer = readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Example with a local image file (you'll need to provide your own image)
const imagePath = join(
  process.cwd(),
  'public',
  'assets',
  'brand',
  'idkhub-logo.png',
);
let base64Image: string;

try {
  base64Image = encodeImageToBase64(imagePath);
  logger.printWithHeader('Image', `Loaded image from: ${imagePath}`);
} catch (_error) {
  logger.error('Could not load image file. Using placeholder text instead.');
  // If image doesn't exist, we'll just do a text-only example
  base64Image = '';
}

const userMessage =
  'What do you see in this image? Please describe it in detail.';
logger.printWithHeader('User', userMessage);

if (base64Image) {
  // Vision example with actual image
  const response = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.create({
      model: 'claude-3-haiku-20240307',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

  logger.printWithHeader(
    'Agent Response',
    response.choices[0].message.content || '',
  );
} else {
  // Fallback example explaining vision capabilities
  const response = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.create({
      model: 'claude-3-haiku-20240307',
      messages: [
        {
          role: 'user',
          content:
            'Explain how to use Claude for image analysis and what types of images it can process.',
        },
      ],
    });

  logger.printWithHeader(
    'Agent Response (Vision Capabilities)',
    response.choices[0].message.content || '',
  );
}
