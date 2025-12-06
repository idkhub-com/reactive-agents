import { z } from 'zod';

// Minimal MCP server schema - just URL and token
export const MCPServer = z.object({
  type: z.string(),
  url: z.string().url(),
  name: z.string().optional(),
  authorization_token: z.string().optional(),
});

export const MCPServers = z.array(MCPServer);

export type MCPServer = z.infer<typeof MCPServer>;
export type MCPServers = z.infer<typeof MCPServers>;
