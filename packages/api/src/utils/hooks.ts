import type { AppContext } from '@api/types/hono';
import type {
  SuperAgentsRequestBody,
  SuperAgentsRequestData,
} from '@shared/types/api/request/body';
import type { SuperAgentsResponseBody } from '@shared/types/api/response/body';
import type { HookLog } from '@shared/types/data';

import { HookType } from '@shared/types/middleware/hooks';

function createHookResponse(
  baseResponse: Response,
  baseResponseBody:
    | SuperAgentsResponseBody
    | ReadableStream
    | FormData
    | ArrayBuffer
    | null,
  hookLogs: HookLog[],
  failedHook?: HookLog,
  override: {
    status?: number;
    headers?: Record<string, string>;
  } = {},
): Response {
  const responseBody = {
    hook_results: {
      input_hooks: hookLogs.filter((h) => h.hook.type === HookType.INPUT_HOOK),
      output_hooks: hookLogs.filter(
        (h) => h.hook.type === HookType.OUTPUT_HOOK,
      ),
    },
    ...(failedHook ? { error: failedHook } : baseResponseBody),
  };

  const response = new Response(JSON.stringify(responseBody), {
    status: override.status || baseResponse.status,
    statusText: baseResponse.statusText,
    headers: override.headers || baseResponse.headers,
  });

  return response;
}

function handleFailedOutputHook(
  response: Response,
  saResponseBody:
    | SuperAgentsResponseBody
    | ReadableStream
    | FormData
    | ArrayBuffer,
  hookLogs: HookLog[],
  failedHook?: HookLog,
): Response {
  if (!saResponseBody) {
    return new Response(saResponseBody, {
      ...response,
      status: 246,
      statusText: 'Hooks failed',
      headers: response.headers,
    });
  }

  return createHookResponse(response, null, hookLogs, failedHook, {
    status: 446,
    headers: { 'content-type': 'application/json' },
  });
}

export async function outputHookHandler(
  c: AppContext,
  saRequestData: SuperAgentsRequestData,
  response: Response,
  saResponseBody: SuperAgentsResponseBody,
  retryAttemptsMade: number,
): Promise<Response> {
  try {
    if (retryAttemptsMade > 0) {
      // Reset the output hook results
      const hookLogs = c.get('hook_logs');

      // Remove the output hook results
      const filteredHookLogs = hookLogs?.filter(
        (h) => h.hook.type !== HookType.OUTPUT_HOOK,
      );

      c.set('hook_logs', filteredHookLogs);
    }

    const executeHooks = c.get('executeHooks');

    const hookLogs = await executeHooks(
      c,
      HookType.OUTPUT_HOOK,
      response.status,
      false,
      saRequestData,
      saResponseBody,
    );

    for (const hookLog of hookLogs) {
      if (hookLog.result.deny_request) {
        return handleFailedOutputHook(
          response,
          saResponseBody,
          hookLogs,
          hookLog,
        );
      }
    }

    return createHookResponse(response, saResponseBody, hookLogs);
  } catch (err) {
    console.error(err);
    return response;
  }
}

function handleFailedInputHook(
  hookLogs: HookLog[],
  failedHook?: HookLog,
): Response {
  return createHookResponse(new Response(), null, hookLogs, failedHook, {
    status: 446,
    headers: { 'content-type': 'application/json' },
  });
}

export async function inputHookHandler(
  c: AppContext,
  saRequestData: SuperAgentsRequestData,
): Promise<{
  errorResponse?: Response;
  transformedSuperAgentsBody?: SuperAgentsRequestBody;
}> {
  try {
    const executeHooks = c.get('executeHooks');

    const hookLogs = await executeHooks(
      c,
      HookType.INPUT_HOOK,
      null,
      false,
      saRequestData,
    );

    let latestTransformedSuperAgentsBody:
      | SuperAgentsRequestBody
      | ReadableStream
      | ArrayBuffer
      | FormData
      | null = null;

    for (const hookLog of hookLogs) {
      if (hookLog.result.deny_request) {
        return {
          errorResponse: handleFailedInputHook(hookLogs, hookLog),
          transformedSuperAgentsBody: saRequestData.requestBody,
        };
      }
      if (hookLog.result.request_body_override) {
        latestTransformedSuperAgentsBody = hookLog.result.request_body_override;
      }
    }
    if (latestTransformedSuperAgentsBody) {
      return {
        transformedSuperAgentsBody: latestTransformedSuperAgentsBody,
      };
    }
  } catch (err) {
    console.error(err);
    return {};
  }

  return {};
}
