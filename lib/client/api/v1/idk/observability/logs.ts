import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import { Log, type LogsQueryParams } from '@shared/types/data/log';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function queryLogs(params: LogsQueryParams): Promise<Log[]> {
  const response = await client.v1.idk.observability.logs.$get({
    query: {
      agent_id: params.agent_id,
      id: params.id,
      app_id: params.app_id,
      function_name: params.function_name,
      before: params.before?.toString(),
      after: params.after?.toString(),
      method: params.method,
      endpoint: params.endpoint,
      status: params.status?.toString(),
      cache_status: params.cache_status,
      embedding_not_null: params.embedding_not_null ? 'true' : 'false',
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch logs`);
  }

  return Log.array().parse(await response.json());
}
