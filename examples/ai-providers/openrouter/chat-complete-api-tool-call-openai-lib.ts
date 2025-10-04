import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

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

// Constants for token limits
const MAX_TOKENS_INITIAL = 300;
const MAX_TOKENS_FINAL = 500;

const idkhubConfig = {
  targets: [
    {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      api_key: process.env.OPENROUTER_API_KEY,
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

// Zod schema for runtime validation
const CalculateArgsSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number(),
});

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
    model: 'openai/gpt-4o-mini',
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
    max_tokens: MAX_TOKENS_INITIAL,
  });

const message1 = response1.choices?.[0]?.message;
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
      // Parse and validate arguments with runtime type checking
      const rawArgs = JSON.parse(toolCall.function.arguments);
      const args = CalculateArgsSchema.parse(rawArgs);

      if (toolCall.function.name === 'calculate') {
        const result = calculate(args.operation, args.a, args.b);
        toolResult = result.toString();
      } else {
        toolResult = `Unknown function: ${toolCall.function.name}`;
      }

      logger.printWithHeader('Tool Result', toolResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toolResult = `Validation Error: ${error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      } else {
        toolResult = `Error: ${error}`;
      }
      logger.printWithHeader('Tool Error', toolResult);
    }

    toolMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResult,
    });
  }

  // Get the final response after tool execution
  // Only make the API call if we have tool results to process
  if (toolMessages.length > 2) {
    // More than system + user message
    const finalResponse = await client
      .withOptions({
        defaultHeaders: {
          'x-idk-config': JSON.stringify(idkhubConfig),
        },
      })
      .chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: toolMessages,
        tools,
        tool_choice: 'auto',
        max_tokens: MAX_TOKENS_FINAL,
      });

    const finalMessage = finalResponse.choices?.[0]?.message;

    // Log the final response
    if (finalMessage.content) {
      logger.printWithHeader('Final Agent Response', finalMessage.content);
    } else if (finalMessage.tool_calls) {
      logger.printWithHeader(
        'Final Agent Response',
        '[Additional tool calls needed]',
      );
      // Note: In a real application, you'd continue the tool call loop here
    } else {
      logger.printWithHeader('Final Agent Response', '[No response content]');
    }
  } else {
    logger.printWithHeader(
      'Final Agent Response',
      '[No tool results to process - skipping final API call]',
    );
  }
}
