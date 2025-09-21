import OpenAI from 'openai';
import 'dotenv/config';
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
      model: 'claude-opus-4-1',
      api_key: process.env.ANTHROPIC_API_KEY,
    },
  ],
  agent_name: 'Vision Assistant',
  skill_name: 'Image Analysis',
};

// Function to fetch image from URL and convert to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    throw new Error(`Error fetching image: ${error}`);
  }
}

async function runVisionExample(): Promise<void> {
  // Use a publicly available image from the internet
  const imageUrl =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';
  let base64Image: string;

  try {
    base64Image = await fetchImageAsBase64(imageUrl);
    logger.printWithHeader('Image', `Loaded image from: ${imageUrl}`);
  } catch (error) {
    logger.error(
      'Could not load image from URL. Using fallback example instead.',
    );
    logger.error(error);
    // If image fetch fails, we'll just do a text-only example
    base64Image = '';
  }

  const userMessage =
    'Analyze this image and tell me: What do you see? What colors and shapes are present? Are there any interesting visual effects or transparency elements? Please provide a detailed description of the composition and any notable features.';
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
        model: 'claude-opus-4-1',
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
        model: 'claude-opus-4-1',
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
}

// Run the example
runVisionExample().catch((error) => {
  logger.error('Error running vision example:', error);
  process.exit(1);
});
