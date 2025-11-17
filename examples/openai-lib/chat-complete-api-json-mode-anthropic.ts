import { resolve } from 'node:path';
import logger from '@shared/console-logging';
import { config } from 'dotenv';
import OpenAI from 'openai';

// Load .env.local first, then fall back to .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'reactive-agents',
  baseURL: 'http://localhost:3000/v1',
});

// Verify API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  logger.printWithHeader(
    '⚠️  Warning',
    'ANTHROPIC_API_KEY not found in environment variables. Please set it in .env.local or .env file.',
  );
}

const raConfig = {
  agent_name: 'reactive-agents',
  skill_name: 'judge',
  targets: [
    {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307', // Using Haiku for testing (verify your API key has access to desired models)
      api_key: process.env.ANTHROPIC_API_KEY, // Make sure this is set in your .env.local or .env
    },
  ],
};

// Test 1: Simple JSON object mode
logger.printWithHeader('Test 1', 'JSON Object Mode');
const response1 = await client.chat.completions.create(
  {
    model: 'claude-3-haiku-20240307',
    messages: [
      {
        role: 'user',
        content:
          'Return a JSON object with name, age, and city for a person named John who is 30 years old and lives in New York.',
      },
    ],
    response_format: {
      type: 'json_object',
    },
    max_tokens: 1000,
  },
  {
    headers: {
      'ra-config': JSON.stringify(raConfig),
    },
  },
);

let content = response1.choices[0]?.message?.content || '{}';

// Extract JSON from content - handle cases where model returns "__json_output\n{...json...}"
if (typeof content === 'string' && content.includes('__json_output')) {
  // Try to extract JSON after "__json_output" (with optional newline)
  const jsonMatch = content.match(/__json_output\s*\n?\s*(\{[\s\S]*\})/);
  const jsonBody = jsonMatch?.[1];
  if (jsonBody) {
    content = jsonBody.trim();
  }
}

// If content is just the tool name, try to extract from tool_calls
if (content === '__json_output' && response1.choices[0]?.message?.tool_calls) {
  const jsonToolCall = response1.choices[0].message.tool_calls.find(
    (tc) => 'function' in tc && tc.function?.name === '__json_output',
  );
  if (
    jsonToolCall &&
    'function' in jsonToolCall &&
    jsonToolCall.function?.arguments
  ) {
    content = jsonToolCall.function.arguments;
  }
}

// Fallback: if still not valid JSON, try to parse as-is or use empty object
let jsonObjectResponse: Record<string, unknown> | string = {};
try {
  jsonObjectResponse = JSON.parse(content);
} catch (_error) {
  logger.printWithHeader(
    '⚠️  Warning',
    `Failed to parse JSON: ${content.substring(0, 100)}`,
  );
  jsonObjectResponse = {};
}
logger.printWithHeader('Response', JSON.stringify(jsonObjectResponse, null, 2));

// Verify it's a valid JSON object
if (typeof jsonObjectResponse === 'object' && jsonObjectResponse !== null) {
  logger.printWithHeader('✓ Test 1 Passed', 'Response is a valid JSON object');
} else {
  logger.printWithHeader(
    '✗ Test 1 Failed',
    'Response is not a valid JSON object',
  );
}

logger.printWithHeader('\nAll Tests Complete', 'Test 1 finished');
