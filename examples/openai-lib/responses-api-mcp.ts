import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import type { ResponseInputItem } from 'openai/resources/responses/responses.mjs';

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
const tools: OpenAI.Responses.Tool[] = [
  {
    type: 'mcp',
    server_label: 'dd_mcp',
    server_description:
      'A Dungeons and Dragons MCP server to assist with dice rolling.',
    server_url: 'https://dmcp-server.deno.dev/sse',
    require_approval: 'never',
  },
];

const userMessage1 = '"Roll 2d4+1"';
logger.printWithHeader('User', userMessage1);

const input: ResponseInputItem[] = [
  {
    role: 'user',
    content: userMessage1,
  },
];

const response1 = await client
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

for (const output of response1.output) {
  if (output.type === 'message') {
    for (const content of output.content) {
      logger.printWithHeader(
        'Agent Response',
        content.type === 'output_text' ? content.text : content.refusal,
      );
    }
  }
}
