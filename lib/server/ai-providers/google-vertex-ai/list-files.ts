import type { RequestHandlerFunction } from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';

export const googleListFilesRequestHandler: RequestHandlerFunction =
  // biome-ignore lint/suspicious/useAwait: this is a request handler
  async () => {
    return new Response(
      JSON.stringify({
        message: 'listFiles is not supported by Google Vertex AI',
        status: 'failure',
        provider: AIProvider.GOOGLE_VERTEX_AI,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  };
