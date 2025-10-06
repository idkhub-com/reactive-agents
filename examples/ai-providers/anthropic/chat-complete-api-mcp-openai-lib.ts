/**
 * Example: Chat Completions with MCP Support (Anthropic)
 *
 * This example demonstrates how to use MCP (Model Context Protocol) servers
 * with Anthropic's Claude models through the Chat Completions API. Note that
 * while IDKHub processes the MCP servers and passes them to the AI provider,
 * the actual AI provider may not natively support MCP headers and may return
 * an error for unknown headers.
 *
 * This is expected behavior - MCP support requires the AI provider to implement
 * the protocol on their end.
 */

import OpenAI from 'openai';
import 'dotenv/config';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable is required');
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
      model: 'claude-3-sonnet-20240229',
      api_key: process.env.ANTHROPIC_API_KEY,
    },
  ],
  agent_name: 'Claude MCP Assistant',
  skill_name: 'Model Context Protocol',
};

// Define MCP servers for Anthropic
const mcpServers = [
  {
    type: 'url',
    url: 'https://anthropic-mcp.modelcontextprotocol.io/sse',
    name: 'anthropic-mcp-server',
    authorization_token: 'anthropic-mcp-token',
  },
  {
    type: 'url',
    url: 'https://claude-tools.modelcontextprotocol.io/sse',
    name: 'claude-tools-server',
    authorization_token: 'claude-tools-token',
  },
];

async function main() {
  const userMessage1 =
    'Help me with creative writing using the available MCP tools';
  console.log('User:', userMessage1);

  const response1 = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.create({
      model: 'claude-3-sonnet-20240229',
      messages: [
        {
          role: 'system',
          content:
            'You are Claude, an AI assistant with access to MCP servers. Use the available MCP servers to help users with creative and analytical tasks.',
        },
        {
          role: 'user',
          content: userMessage1,
        },
      ],
      mcp_servers: mcpServers,
      // biome-ignore lint/suspicious/noExplicitAny: OpenAI library doesn't support mcp_servers field yet
    } as any);

  const agentResponse1 = response1.choices[0].message.content;
  console.log('Claude:', agentResponse1 || '');

  const userMessage2 =
    'Can you also help me with research using the MCP servers?';
  console.log('User:', userMessage2);

  const response2 = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .chat.completions.create({
      model: 'claude-3-sonnet-20240229',
      messages: [
        {
          role: 'system',
          content:
            'You are Claude, an AI assistant with access to MCP servers. Use the available MCP servers to help users with creative and analytical tasks.',
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
      mcp_servers: mcpServers,
      // biome-ignore lint/suspicious/noExplicitAny: OpenAI library doesn't support mcp_servers field yet
    } as any);

  console.log('Claude:', response2.choices[0].message.content || '');
}

main().catch(console.error);
