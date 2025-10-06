import {
  MCPServer,
  MCPServers,
} from '@shared/types/api/routes/shared/mcp-servers';
import { describe, expect, it } from 'vitest';

describe('MCP Servers Types', () => {
  describe('MCPServer', () => {
    it('should validate minimal MCP server with required fields', () => {
      const server = {
        type: 'url',
        url: 'https://example-server.modelcontextprotocol.io/sse',
      };

      expect(() => MCPServer.parse(server)).not.toThrow();
      const parsed = MCPServer.parse(server);
      expect(parsed.type).toBe('url');
      expect(parsed.url).toBe(
        'https://example-server.modelcontextprotocol.io/sse',
      );
      expect(parsed.name).toBeUndefined();
      expect(parsed.authorization_token).toBeUndefined();
    });

    it('should validate MCP server with all fields', () => {
      const server = {
        type: 'url',
        url: 'https://example-server.modelcontextprotocol.io/sse',
        name: 'example-mcp',
        authorization_token: 'YOUR_TOKEN',
      };

      expect(() => MCPServer.parse(server)).not.toThrow();
      const parsed = MCPServer.parse(server);
      expect(parsed.type).toBe('url');
      expect(parsed.url).toBe(
        'https://example-server.modelcontextprotocol.io/sse',
      );
      expect(parsed.name).toBe('example-mcp');
      expect(parsed.authorization_token).toBe('YOUR_TOKEN');
    });

    it('should reject MCP server without required type field', () => {
      const server = {
        url: 'https://example-server.modelcontextprotocol.io/sse',
        name: 'missing-type',
      };

      expect(() => MCPServer.parse(server)).toThrow();
    });

    it('should reject MCP server without required url field', () => {
      const server = {
        type: 'url',
        name: 'missing-url',
      };

      expect(() => MCPServer.parse(server)).toThrow();
    });

    it('should reject MCP server with invalid URL', () => {
      const server = {
        type: 'url',
        url: 'invalid-url',
        name: 'invalid-server',
      };

      expect(() => MCPServer.parse(server)).toThrow();
    });
  });

  describe('MCPServers', () => {
    it('should validate array of MCP servers', () => {
      const servers = [
        {
          type: 'url',
          url: 'https://server1.modelcontextprotocol.io/sse',
          name: 'server-1',
        },
        {
          type: 'url',
          url: 'https://server2.modelcontextprotocol.io/sse',
          name: 'server-2',
          authorization_token: 'TOKEN_2',
        },
      ];

      expect(() => MCPServers.parse(servers)).not.toThrow();
      const parsed = MCPServers.parse(servers);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('server-1');
      expect(parsed[1].name).toBe('server-2');
    });

    it('should validate empty array', () => {
      const servers: unknown[] = [];

      expect(() => MCPServers.parse(servers)).not.toThrow();
      const parsed = MCPServers.parse(servers);
      expect(parsed).toHaveLength(0);
    });

    it('should reject array with invalid server', () => {
      const servers = [
        {
          type: 'url',
          url: 'https://valid-server.modelcontextprotocol.io/sse',
          name: 'valid-server',
        },
        {
          type: 'url',
          url: 'invalid-url',
          name: 'invalid-server',
        },
      ];

      expect(() => MCPServers.parse(servers)).toThrow();
    });
  });
});
