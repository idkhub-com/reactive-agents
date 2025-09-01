import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import type {
  CodeInterpreter,
  ComputerTool,
  CustomTool,
  FileSearchTool,
  FunctionTool,
  ImageGeneration,
  LocalShell,
  Mcp,
  WebSearchTool,
} from '@shared/types/api/routes/responses-api/request';
import type { ChatCompletionTool } from '@shared/types/api/routes/shared/tools';
import type { ToolCreateParams } from '@shared/types/data/tool';
import type { Next } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { createMiddleware } from 'hono/factory';

import stableStringify from 'json-stable-stringify';

type ResponsesTool =
  | FunctionTool
  | FileSearchTool
  | WebSearchTool
  | ComputerTool
  | Mcp
  | CodeInterpreter
  | ImageGeneration
  | LocalShell
  | CustomTool;

async function produceToolCache(
  completionTool: ChatCompletionTool | ResponsesTool,
): Promise<string> {
  const stringToHash = stableStringify(completionTool);

  const encodedHash = new TextEncoder().encode(stringToHash);

  const cacheDigest = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    encodedHash,
  );

  return Array.from(new Uint8Array(cacheDigest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getToolsFromChatCompletionRequest(
  idkRequestData: ChatCompletionRequestData | StreamChatCompletionRequestData,
): ChatCompletionTool[] {
  const tools = idkRequestData.requestBody.tools || [];

  if (!tools) {
    return [];
  }

  return tools;
}

function getToolsFromCreateModelResponseRequest(
  idkRequestData: ResponsesRequestData,
): ResponsesTool[] {
  const tools = idkRequestData.requestBody.tools || [];

  if (!tools) {
    return [];
  }

  return tools;
}

async function captureTool(
  agent_id: string,
  idkRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  let completionTools: (ChatCompletionTool | ResponsesTool)[] = [];

  if (
    idkRequestData.functionName === FunctionName.CHAT_COMPLETE ||
    idkRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE
  ) {
    completionTools = getToolsFromChatCompletionRequest(idkRequestData);
  } else if (
    idkRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE
  ) {
    completionTools = getToolsFromCreateModelResponseRequest(idkRequestData);
  }

  await Promise.all(
    completionTools.map(async (completionTool) => {
      const hash = await produceToolCache(completionTool);

      // Extract name based on tool type
      let toolName = '';
      if (completionTool.type === 'function') {
        if ('name' in completionTool) {
          // New ResponsesTool FunctionTool format
          toolName = completionTool.name as string;
        } else if (
          'function' in completionTool &&
          completionTool.function?.name
        ) {
          // Legacy ChatCompletionTool format
          toolName = (completionTool as ChatCompletionTool).function.name;
        }
      } else if (
        completionTool.type === 'mcp' &&
        'server_label' in completionTool
      ) {
        // MCP tools use server_label
        toolName = (completionTool as Mcp).server_label;
      } else if (completionTool.type === 'custom' && 'name' in completionTool) {
        // Custom tools have name
        toolName = (completionTool as CustomTool).name;
      } else {
        // For other tool types, use the type as name
        toolName = completionTool.type;
      }

      const tool: ToolCreateParams = {
        agent_id,
        hash,
        type: completionTool.type,
        name: toolName,
        raw_data: completionTool,
      };

      try {
        await userDataStorageConnector.createTool(tool);
      } catch {
        // If the tool already exists, we don't need to do anything
      }
    }),
  );
}

export const toolMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    await next();

    const idkRequestData = c.get('idk_request_data');

    // If idkRequestData is not set, it means that this is not an endpoint that we want to capture
    if (!idkRequestData) {
      return;
    }

    // These are the endpoints that can contain tools
    if (
      idkRequestData.functionName !== FunctionName.CHAT_COMPLETE &&
      idkRequestData.functionName !== FunctionName.STREAM_CHAT_COMPLETE &&
      idkRequestData.functionName !== FunctionName.CREATE_MODEL_RESPONSE
    ) {
      return;
    }

    if (getRuntimeKey() === 'workerd') {
      c.executionCtx.waitUntil(
        captureTool(
          c.get('agent').id,
          idkRequestData,
          c.get('user_data_storage_connector'),
        ),
      );
    } else {
      await captureTool(
        c.get('agent').id,
        idkRequestData,
        c.get('user_data_storage_connector'),
      );
    }
  },
);
