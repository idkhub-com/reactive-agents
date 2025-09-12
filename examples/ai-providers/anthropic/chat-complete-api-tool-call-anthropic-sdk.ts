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
      model: 'claude-3-haiku-20240307',
      api_key: process.env.ANTHROPIC_API_KEY,
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
];

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

const userMessage1 = 'What is 15 multiplied by 8?';
logger.printWithHeader('User', userMessage1);

const response1 = await client
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
        content: userMessage1,
      },
    ],
    tools,
    tool_choice: 'auto',
  });

logger.printWithHeader('Agent Response', 'Processing tool calls...');

const firstChoice = response1.choices[0];
const toolCalls = firstChoice?.message?.tool_calls;

if (toolCalls && toolCalls.length > 0) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: userMessage1,
    },
    {
      role: 'assistant',
      content: firstChoice.message.content,
      tool_calls: toolCalls,
    },
  ];

  for (const toolCall of toolCalls) {
    if (toolCall.type !== 'function') continue;

    logger.printWithHeader(
      'Tool Call',
      `${toolCall.function.name}(${toolCall.function.arguments})`,
    );

    let toolResult: string;
    try {
      if (toolCall.function.name === 'calculate') {
        const args = JSON.parse(toolCall.function.arguments);
        const { operation, a, b } = args as {
          operation: string;
          a: number;
          b: number;
        };
        const result = calculate(operation, a, b);
        toolResult = result.toString();
      } else {
        toolResult = `Unknown function: ${toolCall.function.name}`;
      }

      logger.printWithHeader('Tool Result', toolResult);
    } catch (error) {
      toolResult = `Error: ${error}`;
      logger.printWithHeader('Tool Error', toolResult);
    }

    messages.push({
      role: 'tool',
      content: toolResult,
      tool_call_id: toolCall.id,
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
      model: 'claude-3-haiku-20240307',
      messages,
      tools,
    });

  const finalText = finalResponse.choices[0]?.message?.content || '';
  logger.printWithHeader('Final Agent Response', finalText);
} else {
  const responseText = firstChoice?.message?.content || '';
  logger.printWithHeader('Agent Response', responseText);
}
