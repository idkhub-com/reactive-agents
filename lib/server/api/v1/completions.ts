import { HttpError } from '@server/errors/http';
import { RouterError } from '@server/errors/router';
import { tryTargets } from '@server/handlers/handler-utils';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';

export const completionsRouter = new Hono<AppEnv>()

  /**
   * Handles the '/completions' API request by selecting the appropriate provider(s) and making the request to them.
   */
  .post(async (c): Promise<Response> => {
    try {
      const idkConfig = c.get('idk_config');
      const idkRequestData = c.get('idk_request_data');

      const tryTargetsResponse = await tryTargets(c, idkConfig, idkRequestData);

      // Check if the response contains an error message even with 200 status
      if (tryTargetsResponse.ok) {
        const responseText = await tryTargetsResponse.clone().text();
        try {
          const responseJson = JSON.parse(responseText);
          if (responseJson.error || responseJson.message?.includes('error')) {
            // This is an error response with 200 status, treat it as an error
            const errorMessage =
              responseJson.error?.message ||
              responseJson.message ||
              'Request failed';
            const statusCode = responseJson.error?.status || 400;

            return new Response(
              JSON.stringify({
                error: {
                  message: errorMessage,
                  type: 'api_error',
                  code: null,
                  param: null,
                },
              }),
              {
                status: statusCode,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
        } catch {
          // If JSON parsing fails, check if it's a plain text error response
          if (
            responseText.includes('Message:') &&
            responseText.includes('Cause:') &&
            responseText.includes('Name:')
          ) {
            // This is a plain text error response from the retry handler
            return new Response(
              JSON.stringify({
                error: {
                  message: responseText,
                  type: 'api_error',
                  code: null,
                  param: null,
                },
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
      }

      return tryTargetsResponse;
    } catch (err) {
      console.error('completions error:', err);

      let statusCode = 500;
      let errorMessage = 'Something went wrong';

      if (err instanceof RouterError) {
        statusCode = 400;
        errorMessage = err.message;
      } else if (err instanceof HttpError) {
        statusCode = err.response.status;
        errorMessage = err.response.body || err.message || 'Request failed';
      } else if (err instanceof Error) {
        errorMessage = err.message || 'Something went wrong';
        // Check if this is a configuration error that should return 400
        if (
          err.message.includes('is required in target') ||
          err.message.includes('is required') ||
          err.message.includes('Content-Type header is required')
        ) {
          statusCode = 400;
        }
      }

      return new Response(
        JSON.stringify({
          error: {
            message: errorMessage,
            type:
              statusCode >= 400 && statusCode < 500
                ? 'invalid_request_error'
                : 'api_error',
            code: null,
            param: null,
          },
        }),
        {
          status: statusCode,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
  });
