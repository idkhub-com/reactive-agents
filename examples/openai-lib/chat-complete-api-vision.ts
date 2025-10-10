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
  targets: [{ optimization: 'auto' }],
  agent_name: 'vision_assistant',
  skill_name: 'image_analysis',
};

// Function to fetch image from URL and convert to base64 with timeout and retry logic
async function fetchImageAsBase64(
  imageUrl: string,
  maxRetries = 3,
  timeoutMs = 10000,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'IDKHub-Agent/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        throw new Error(
          `Invalid content type: ${contentType}. Expected image/*`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeoutMs}ms`);
      }

      logger.error(
        `Attempt ${attempt}/${maxRetries} failed:`,
        lastError.message,
      );

      // Don't retry on certain types of errors
      if (
        lastError.message.includes('HTTP 4') ||
        lastError.message.includes('Invalid content type')
      ) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
        logger.error(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to fetch image after ${maxRetries} attempts: ${lastError?.message}`,
  );
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
