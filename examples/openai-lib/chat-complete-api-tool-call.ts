import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'reactive-agents',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calculator_assistant',
  skill_name: 'mathematics',
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
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-4o-mini',
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
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .chat.completions.create({
      model: 'gpt-4o-mini',
      messages: toolMessages,
      tools,
      tool_choice: 'auto',
    });

  logger.printWithHeader(
    'Final Agent Response',
    finalResponse.choices[0].message.content || '',
  );
}
