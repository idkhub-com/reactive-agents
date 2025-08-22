import { providerConfigs } from '@server/ai-providers';
import { RealtimeLlmEventParser } from '@server/services/realtime-llm-event-parser';
import type { AppContext } from '@server/types/hono';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import type { RealtimeSessionOptions } from '@shared/types/realtime';
import type { WSContext, WSEvents } from 'hono/ws';
import { WebSocket } from 'ws';

export async function realTimeHandlerNode(
  c: AppContext,
): Promise<WSEvents<unknown>> {
  try {
    let incomingWebsocket: WSContext<unknown> | null = null;

    const idkConfig = c.get('idk_config');
    const idkRequestData = c.get('idk_request_data');

    const provider = idkConfig?.targets[0]?.provider;
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
    const idkTarget = idkConfig.targets[0];
    const baseUrl = apiConfig.getBaseURL({
      c,
      idkTarget,
      idkRequestData,
    });
    const endpoint = apiConfig.getEndpoint({
      c,
      idkTarget,
      idkRequestData,
    });
    let url = `${baseUrl}${endpoint}`;
    url = url.replace('https://', 'wss://');

    const requestHeaders = await apiConfig.headers({
      c,
      idkTarget,
      idkRequestData,
    });

    const sessionOptions: RealtimeSessionOptions = {
      id: crypto.randomUUID(),
      providerOptions: {
        ...idkTarget,
        requestURL: url,
        rubeusURL: 'realtime',
      },
      requestHeaders,
      requestParams: {},
    };

    const outgoingWebSocket = new WebSocket(url, { headers: requestHeaders });
    const eventParser = new RealtimeLlmEventParser();

    outgoingWebSocket.addEventListener('message', (event) => {
      incomingWebsocket?.send(event.data as string);
      try {
        const parsedData = JSON.parse(event.data as string);
        eventParser.handleEvent(c, parsedData, sessionOptions);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(`eventParser.handleEvent error: ${err.message}`);
        } else {
          console.error(`eventParser.handleEvent error: ${err}`);
        }
      }
    });

    outgoingWebSocket.addEventListener('close', (event) => {
      incomingWebsocket?.close(event.code, event.reason);
    });

    outgoingWebSocket.addEventListener('error', (event) => {
      console.error(`outgoingWebSocket error: ${event.message}`);
      incomingWebsocket?.close();
    });

    return {
      onOpen(_event, ws): void {
        incomingWebsocket = ws;
      },
      onMessage(event): void {
        outgoingWebSocket?.send(event.data as string);
      },
      onError(event): void {
        console.error(`incomingWebsocket error: ${event.type}`);
        outgoingWebSocket?.close();
      },
      onClose(): void {
        outgoingWebSocket?.close();
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`realtimeHandlerNode error: ${err.message}`);
    } else {
      console.error(`realtimeHandlerNode error: ${err}`);
    }
    c.set('websocket_error', true);
    return {
      onOpen(): void {
        // pass
      },
      onMessage(): void {
        // pass
      },
      onError(): void {
        // pass
      },
      onClose(): void {
        // pass
      },
    };
  }
}
