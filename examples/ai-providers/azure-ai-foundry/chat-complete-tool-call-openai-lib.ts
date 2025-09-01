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
  agent_name: 'Calculator Assistant',
  skill_name: 'Mathematics',
};

// Define available tools
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform basic arithmetic operations',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: 'The arithmetic operation to perform',
          },
          a: {
            type: 'number',
            description: 'The first number',
          },
          b: {
            type: 'number',
            description: 'The second number',
          },
        },
        required: ['operation', 'a', 'b'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a city',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'The city name',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
            default: 'celsius',
          },
        },
        required: ['city'],
      },
    },
  },
];

// Mock function implementations
function calculate(operation: string, a: number, b: number): number {
  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

function getWeather(city: string, unit = 'celsius'): object {
  // Mock weather data
  const temp = unit === 'celsius' ? 22 : 72;
  return {
    city,
    temperature: temp,
    unit,
    condition: 'sunny',
    humidity: 65,
  };
}

const userMessage1 = 'What is 15 multiplied by 8?';
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
          'You are a helpful assistant that can perform calculations and get weather information. Use the available tools when needed.',
      },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    tools,
    tool_choice: 'auto',
    temperature: 0.1,
  });

const message1 = response1.choices[0].message;
logger.printWithHeader(
  'Agent Response',
  message1.content || '[Tool calls made]',
);

// Handle tool calls if present
if (message1.tool_calls) {
  logger.printWithHeader(
    'Tool Calls',
    `${message1.tool_calls.length} tool(s) called`,
  );

  const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant that can perform calculations and get weather information. Use the available tools when needed.',
    },
    {
      role: 'user',
      content: userMessage1,
    },
    message1,
  ];

  for (const toolCall of message1.tool_calls) {
    if (toolCall.type !== 'function') continue;

    logger.printWithHeader(
      'Tool Call',
      `${toolCall.function.name}(${toolCall.function.arguments})`,
    );

    let toolResult: string;
    try {
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'calculate') {
        const result = calculate(args.operation, args.a, args.b);
        toolResult = result.toString();
      } else if (toolCall.function.name === 'get_weather') {
        const result = getWeather(args.city, args.unit);
        toolResult = JSON.stringify(result);
      } else {
        toolResult = `Unknown function: ${toolCall.function.name}`;
      }

      logger.printWithHeader('Tool Result', toolResult);
    } catch (error) {
      toolResult = `Error: ${error}`;
      logger.printWithHeader('Tool Error', toolResult);
    }

    toolMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResult,
    });
  }

  // Get the final response after tool execution
  const finalResponse = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.create({
      model: 'DeepSeek-R1-0528',
      messages: toolMessages,
      tools,
      tool_choice: 'auto',
      temperature: 0.1,
    });

  logger.printWithHeader(
    'Final Agent Response',
    finalResponse.choices[0].message.content || '',
  );
}

// Second example with weather
const userMessage2 =
  "What's the weather like in Tokyo and also calculate 42 divided by 6?";
logger.printWithHeader('\nUser', userMessage2);

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
          'You are a helpful assistant that can perform calculations and get weather information. Use the available tools when needed.',
      },
      {
        role: 'user',
        content: userMessage2,
      },
    ],
    tools,
    tool_choice: 'auto',
    parallel_tool_calls: true,
    temperature: 0.1,
  });

const message2 = response2.choices[0].message;
logger.printWithHeader(
  'Agent Response',
  message2.content || '[Tool calls made]',
);

// Handle multiple tool calls
if (message2.tool_calls) {
  logger.printWithHeader(
    'Multiple Tool Calls',
    `${message2.tool_calls.length} tool(s) called in parallel`,
  );

  const toolMessages2: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant that can perform calculations and get weather information. Use the available tools when needed.',
    },
    {
      role: 'user',
      content: userMessage2,
    },
    message2,
  ];

  for (const toolCall of message2.tool_calls) {
    if (toolCall.type !== 'function') continue;

    logger.printWithHeader(
      'Tool Call',
      `${toolCall.function.name}(${toolCall.function.arguments})`,
    );

    let toolResult: string;
    try {
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'calculate') {
        const result = calculate(args.operation, args.a, args.b);
        toolResult = result.toString();
      } else if (toolCall.function.name === 'get_weather') {
        const result = getWeather(args.city, args.unit);
        toolResult = JSON.stringify(result);
      } else {
        toolResult = `Unknown function: ${toolCall.function.name}`;
      }

      logger.printWithHeader('Tool Result', toolResult);
    } catch (error) {
      toolResult = `Error: ${error}`;
      logger.printWithHeader('Tool Error', toolResult);
    }

    toolMessages2.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResult,
    });
  }

  // Get the final response after all tools executed
  const finalResponse2 = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.create({
      model: 'DeepSeek-R1-0528',
      messages: toolMessages2,
      tools,
      tool_choice: 'auto',
      temperature: 0.1,
    });

  logger.printWithHeader(
    'Final Agent Response',
    finalResponse2.choices[0].message.content || '',
  );
}
