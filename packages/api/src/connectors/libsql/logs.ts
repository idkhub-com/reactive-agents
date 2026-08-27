import type { LogsStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import {
  Log,
  type LogCreateParams,
  type LogsQueryParams,
} from '@shared/types/data/log';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getLibsqlClient } from './client';
import { insertInto, parseRows } from './query';
import { asColumns, toJsonColumn } from './rows';

/**
 * Reads go through `logs_with_eval_scores`, which carries the computed
 * `avg_eval_score` and `eval_run_count`, exactly as the Supabase connector
 * does. Writes go to the `logs` table itself.
 */
export const libsqlLogsStorageConnector: LogsStorageConnector = {
  getLogs: async (
    c: AppContext,
    queryParams: LogsQueryParams,
  ): Promise<Log[]> => {
    const conditions: string[] = [];
    const args: (string | number)[] = [];

    const eq = (column: string, value: string | number | undefined) => {
      if (value !== undefined) {
        conditions.push(`${column} = ?`);
        args.push(value);
      }
    };

    eq('agent_id', queryParams.agent_id);
    eq('skill_id', queryParams.skill_id);
    eq('cluster_id', queryParams.cluster_id);
    eq('arm_id', queryParams.arm_id);
    eq('app_id', queryParams.app_id);
    eq('id', queryParams.id);
    eq('method', queryParams.method);
    eq('endpoint', queryParams.endpoint);
    eq('function_name', queryParams.function_name);
    eq('status', queryParams.status);
    eq('cache_status', queryParams.cache_status);

    if (queryParams.embedding_not_null) {
      conditions.push('embedding IS NOT NULL');
    }
    if (queryParams.after !== undefined) {
      conditions.push('start_time >= ?');
      args.push(queryParams.after);
    }
    if (queryParams.before !== undefined) {
      conditions.push('start_time <= ?');
      args.push(queryParams.before);
    }

    let sql = 'SELECT * FROM logs_with_eval_scores';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY start_time DESC';

    if (queryParams.limit !== undefined) {
      sql += ' LIMIT ?';
      args.push(queryParams.limit);
    }
    if (queryParams.offset !== undefined) {
      if (queryParams.limit === undefined) {
        sql += ' LIMIT -1';
      }
      sql += ' OFFSET ?';
      args.push(queryParams.offset);
    }

    const result = await getLibsqlClient(c).execute({ sql, args });
    return parseRows('logs_with_eval_scores', result.rows, z.array(Log));
  },

  createLog: async (
    c: AppContext,
    createParams: LogCreateParams,
  ): Promise<Log> => {
    const {
      base_sa_config,
      ai_provider_request_log,
      hook_logs,
      metadata,
      embedding,
      user_metadata,
      ...rest
    } = createParams as LogCreateParams & Record<string, unknown>;

    const rows = await insertInto(
      getLibsqlClient(c),
      'logs',
      {
        ...asColumns(rest),
        id: uuidv4(),
        base_sa_config: toJsonColumn(base_sa_config),
        ai_provider_request_log: toJsonColumn(ai_provider_request_log),
        hook_logs: toJsonColumn(hook_logs ?? []),
        metadata: toJsonColumn(metadata ?? {}),
        embedding:
          embedding === undefined ? undefined : toJsonColumn(embedding),
        user_metadata:
          user_metadata === undefined ? undefined : toJsonColumn(user_metadata),
      },
      z.array(Log),
    );

    return rows[0];
  },

  deleteLog: async (c: AppContext, id: string): Promise<void> => {
    await getLibsqlClient(c).execute({
      sql: 'DELETE FROM logs WHERE id = ?',
      args: [id],
    });
  },
};
