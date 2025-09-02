import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import type { ResponseInputItem } from 'openai/resources/responses/responses.mjs';

if (!process.env.AZURE_OPENAI_API_KEY) {
  logger.error('AZURE_OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

if (!process.env.AZURE_OPENAI_URL) {
  logger.error('AZURE_OPENAI_URL environment variable is required');
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
      provider: 'azure-openai',
      model: 'gpt-5-mini',
      api_key: process.env.AZURE_OPENAI_API_KEY,
      azure_openai_config: {
        url: process.env.AZURE_OPENAI_URL,
      },
    },
  ],
  agent_name: 'Calculator Assistant',
  skill_name: 'Mathematics',
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
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .responses.create({
    model: 'gpt-5-mini',
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
