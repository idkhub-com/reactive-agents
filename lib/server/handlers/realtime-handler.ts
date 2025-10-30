import { providerConfigs } from '@server/ai-providers';
import { RealtimeLlmEventParser } from '@server/services/realtime-llm-event-parser';
import type { AppContext } from '@server/types/hono';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import type { RealtimeSessionOptions } from '@shared/types/realtime';
import {
  addListeners,
  getOptionsForOutgoingConnection,
  getURLForOutgoingConnection,
} from './websocket-utils';

// Define types for Cloudflare Workers WebSocket environment
interface WorkerWebSocket extends WebSocket {
  accept(): void;
}

interface WorkerResponse extends Response {
  webSocket: WorkerWebSocket;
}

// Cloudflare Workers WebSocketPair constructor
declare const WebSocketPair: {
  new (): [WebSocket, WorkerWebSocket];
};

const getOutgoingWebSocket = async (
  url: string,
  options: RequestInit,
): Promise<WorkerWebSocket> => {
  let outgoingWebSocket: WorkerWebSocket | null = null;
  try {
    const response = (await fetch(url, options)) as WorkerResponse;
    outgoingWebSocket = response.webSocket;
  } catch (error) {
    console.error(error);
  }

  if (!outgoingWebSocket) {
    throw new Error('WebSocket connection failed');
  }

  outgoingWebSocket.accept();
  return outgoingWebSocket;
};

export async function realTimeHandler(c: AppContext): Promise<Response> {
  try {
    const headers = c.req.header();
    const raRequestData = c.get('ra_request_data');

    const raConfig = c.get('ra_config');
    const provider = raConfig.targets[0].configuration.ai_provider;

    if (!provider) {
      throw new Error('Provider not found');
    }

    const providerConfig = providerConfigs[provider];
    if (!providerConfig) {
      throw new Error('Provider not found');
    }

    const apiConfig: InternalProviderAPIConfig = providerConfig.api;
    if (!apiConfig) {
      throw new Error('API config not found');
    }
    const url = getURLForOutgoingConnection(
      c,
      apiConfig,
      raConfig.targets[0],
      raRequestData,
    );
    const options = await getOptionsForOutgoingConnection(
      c,
      apiConfig,
      raConfig.targets[0],
    );

    const sessionOptions: RealtimeSessionOptions = {
      id: crypto.randomUUID(),
      providerOptions: {
        ...raConfig.targets[0],
        requestURL: url,
        rubeusURL: 'realtime',
      },
      requestHeaders: headers as Record<string, string>,
      requestParams: {},
    };

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];

    server.accept();

    const outgoingWebSocket = await getOutgoingWebSocket(url, options);
    const eventParser = new RealtimeLlmEventParser();
    addListeners(outgoingWebSocket, eventParser, server, c, sessionOptions);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit);
  } catch (err: unknown) {
    console.error(
      'realtimeHandler error',
      err instanceof Error ? err.message : String(err),
    );
    return new Response(
      JSON.stringify({
        status: 'failure',
        message: 'Something went wrong',
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }
}
