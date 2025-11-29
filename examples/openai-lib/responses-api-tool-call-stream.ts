import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import type { ResponseInputItem } from 'openai/resources/responses/responses.mjs';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  agent_name: 'calculator_assistant',
  skill_name: 'mathematics',
};

// Define available tools
const tools: OpenAI.Responses.Tool[] = [
  {
    type: 'function',
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
      additionalProperties: false,
    },
    strict: true,
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

const input: ResponseInputItem[] = [
  {
    role: 'user',
    content: userMessage1,
  },
];

logger.printWithHeader('Agent Response', '[Streaming tool calls...]');

const stream1 = client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .responses.stream({
    model: 'gpt-4o-mini',
    input,
    tools,
    tool_choice: 'required',
  })
  .on('response.output_text.delta', (event) => {
    process.stdout.write(event.delta);
  })
  .on('error', (error) => {
    logger.error(error);
  });

const response1 = await stream1.finalResponse();

console.log(); // New line after streaming

// Execute the function calls from the response
for (const output of response1.output) {
  input.push(output);

  if (output.type !== 'function_call') {
    continue;
  }

  logger.printWithHeader('Tool Call', `${output.name}(${output.arguments})`);

  let toolResult: string;
  try {
    const args = JSON.parse(output.arguments);

    if (output.name === 'calculate') {
      const result = calculate(args.operation, args.a, args.b);
      toolResult = result.toString();
    } else {
      toolResult = `Unknown function: ${output.name}`;
    }

    logger.printWithHeader('Tool Result', toolResult);
  } catch (error) {
    toolResult = `Error: ${error}`;
    logger.printWithHeader('Tool Error', toolResult);
  }

  input.push({
    type: 'function_call_output',
    call_id: output.call_id,
    output: toolResult,
  });
}

// Get the final response after tool execution
const finalResponse = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .responses.create({
    model: 'gpt-4o-mini',
    input,
    tools,
    tool_choice: 'auto',
  });

logger.printWithHeader('Final Agent Response', finalResponse.output_text || '');
