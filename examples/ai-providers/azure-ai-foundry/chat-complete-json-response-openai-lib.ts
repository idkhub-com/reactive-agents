import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

if (!process.env.AZURE_AI_FOUNDRY_API_KEY) {
  logger.error('AZURE_AI_FOUNDRY_API_KEY environment variable is required');
  process.exit(1);
}

if (!process.env.AZURE_AI_FOUNDRY_URL) {
  logger.error('AZURE_AI_FOUNDRY_URL environment variable is required');
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
      provider: 'azure-ai-foundry',
      model: 'DeepSeek-R1-0528',
      api_key: process.env.AZURE_AI_FOUNDRY_API_KEY,
      azure_ai_foundry_url: process.env.AZURE_AI_FOUNDRY_URL,
    },
  ],
  agent_name: 'JSON Data Analyst',
  skill_name: 'Data Analysis',
};

const userMessage1 =
  'Analyze the weather data for New York and provide a structured JSON response with temperature, humidity, and weather condition.';
logger.printWithHeader('User', userMessage1);

const response1 = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'DeepSeek-R1-0528',
    messages: [
      {
        role: 'system',
        content:
          'You are a weather data analyst. Always respond with valid JSON format containing the requested weather information.',
      },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    response_format: {
      type: 'json_object',
    },
    temperature: 0.3,
  });

const agentResponse1 = response1.choices[0].message.content;
logger.printWithHeader('Agent (JSON Response)', agentResponse1 || '');

// Parse and display the JSON response
try {
  const weatherData = JSON.parse(agentResponse1 || '{}');
  logger.printWithHeader('Parsed JSON', JSON.stringify(weatherData, null, 2));
} catch (error) {
  logger.error('Failed to parse JSON response:', error);
}

const userMessage2 =
  'Now provide a comparison with Los Angeles weather in the same JSON format.';
logger.printWithHeader('User', userMessage2);

const response2 = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'DeepSeek-R1-0528',
    messages: [
      {
        role: 'system',
        content:
          'You are a weather data analyst. Always respond with valid JSON format containing the requested weather information.',
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
    response_format: {
      type: 'json_object',
    },
    temperature: 0.3,
  });

const agentResponse2 = response2.choices[0].message.content;
logger.printWithHeader('Agent (JSON Comparison)', agentResponse2 || '');

// Parse and display the comparison JSON response
try {
  const comparisonData = JSON.parse(agentResponse2 || '{}');
  logger.printWithHeader(
    'Parsed Comparison JSON',
    JSON.stringify(comparisonData, null, 2),
  );
} catch (error) {
  logger.error('Failed to parse comparison JSON response:', error);
}
