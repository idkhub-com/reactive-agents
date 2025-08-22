import type { RealtimeLlmEventParser } from '@server/services/realtime-llm-event-parser';
import type { AppContext } from '@server/types/hono';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import type { IdkRequestData } from '@shared/types/api/request';
import type { IdkTarget } from '@shared/types/api/request/headers';
import type { RealtimeSessionOptions } from '@shared/types/realtime';

export const addListeners = (
  outgoingWebSocket: WebSocket,
  eventParser: RealtimeLlmEventParser,
  server: WebSocket,
  c: AppContext,
  sessionOptions: RealtimeSessionOptions,
): void => {
  outgoingWebSocket.addEventListener('message', (event) => {
    server?.send(event.data as string);
    try {
      const parsedData = JSON.parse(event.data as string);
      eventParser.handleEvent(c, parsedData, sessionOptions);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('outgoingWebSocket message parse error', err.message);
      } else {
        console.error('outgoingWebSocket message parse error', err);
      }
    }
  });

  outgoingWebSocket.addEventListener('close', (event) => {
    server?.close(event.code, event.reason);
  });

  outgoingWebSocket.addEventListener('error', (event) => {
    console.error('outgoingWebSocket error', event);
    server?.close();
  });

  server.addEventListener('message', (event) => {
    outgoingWebSocket?.send(event.data as string);
  });

  server.addEventListener('close', () => {
    outgoingWebSocket?.close();
  });

  server.addEventListener('error', (event) => {
    console.error('serverWebSocket error', event);
    outgoingWebSocket?.close();
  });
};

export const getOptionsForOutgoingConnection = async (
  c: AppContext,
  apiConfig: InternalProviderAPIConfig,
  idkTarget: IdkTarget,
): Promise<{
  headers: Record<string, string>;
  method: string;
}> => {
  const idkRequestData = c.get('idk_request_data');
  const headers = await apiConfig.headers({
    c,
    idkTarget,
    idkRequestData,
  });
  headers.Upgrade = 'websocket';
  headers.Connection = 'Keep-Alive';
  headers['Keep-Alive'] = 'timeout=600';
  return {
    headers,
    method: 'GET',
  };
};

export const getURLForOutgoingConnection = (
  c: AppContext,
  apiConfig: InternalProviderAPIConfig,
  idkTarget: IdkTarget,
  idkRequestData: IdkRequestData,
): string => {
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
  return `${baseUrl}${endpoint}`;
};
