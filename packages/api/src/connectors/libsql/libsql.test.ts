import { CACHE_TTL_SECONDS } from '@api/constants';
import type { AppContext } from '@api/types/hono';
import type { Client } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { libsqlCacheStorageConnector } from './cache';
import {
  createLibsqlClient,
  ensureForeignKeys,
  resetLibsqlClients,
} from './client';
import { fingerprintOf, migrateLibsql, StaleMigrationError } from './migrate';
import {
  buildInsert,
  buildUpdate,
  fromBool,
  fromJson,
  normaliseRow,
  toBoolColumn,
  toJsonColumn,
} from './rows';
import { libsqlMigrations } from './schema';

/**
 * Each case gets its own in-memory database. `createClient` returns a fresh one
 * per call, and the module-level cache is keyed by URL, so the reset is what
 * keeps them from sharing.
 */
let dbCounter = 0;
const freshDatabase = async (): Promise<{ client: Client; c: AppContext }> => {
  resetLibsqlClients();
  dbCounter += 1;
  const url = ':memory:';
  const client = createLibsqlClient(url);
  await migrateLibsql(client);
  const c = { env: { LIBSQL_URL: url } } as unknown as AppContext;
  return { client, c };
};

/** Minimal parent rows, since almost everything hangs off an agent and skill. */
const seedAgentAndSkill = async (client: Client) => {
  await client.execute({
    sql: 'INSERT INTO agents (id, name, description) VALUES (?, ?, ?)',
    args: ['agent-1', `agent-${dbCounter}`, 'test agent'],
  });
  await client.execute({
    sql: 'INSERT INTO skills (id, agent_id, name, description) VALUES (?, ?, ?, ?)',
    args: ['skill-1', 'agent-1', 'skill', 'test skill'],
  });
};

const seedLog = async (client: Client, id: string) => {
  await client.execute({
    sql: `INSERT INTO logs (
            id, agent_id, skill_id, method, endpoint, function_name, status,
            start_time, end_time, duration, base_sa_config, ai_provider, model,
            ai_provider_request_log, hook_logs, metadata, cache_status
          ) VALUES (?, ?, ?, 'POST', '/v1/chat/completions', 'chat_complete', 200,
                    1, 2, 1, '{}', 'openai', 'gpt-5', '{}', '[]', '{}', 'MISS')`,
    args: [id, 'agent-1', 'skill-1'],
  });
};

describe('libsql migrations', () => {
  beforeEach(() => {
    resetLibsqlClients();
  });

  it('applies the initial schema and records it', async () => {
    const { client } = await freshDatabase();

    const applied = await client.execute(
      'SELECT version FROM schema_migrations ORDER BY version',
    );
    expect(applied.rows.map((r) => String(r.version))).toEqual([
      '0001_initial_schema',
      '0002_feedbacks_updated_at',
      '0003_default_system_settings',
    ]);
  });

  it('creates every table and view the connector relies on', async () => {
    const { client } = await freshDatabase();

    const result = await client.execute(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view')",
    );
    const names = new Set(result.rows.map((r) => String(r.name)));

    for (const table of [
      'agents',
      'skills',
      'skill_optimization_clusters',
      'skill_routing',
      'skill_creation_leases',
      'tools',
      'logs',
      'feedbacks',
      'improved_responses',
      'cache',
      'ai_providers',
      'models',
      'skill_models',
      'agent_models',
      'skill_optimization_arms',
      'skill_optimization_evaluations',
      'skill_optimization_arm_stats',
      'skill_optimization_evaluation_runs',
      'skill_events',
      'system_settings',
      'logs_with_eval_scores',
      'evaluation_runs_with_scores',
    ]) {
      expect(names, `missing ${table}`).toContain(table);
    }
  });

  it('is idempotent', async () => {
    const { client } = await freshDatabase();

    const ran = await migrateLibsql(client);
    expect(ran).toEqual([]);

    const applied = await client.execute(
      'SELECT COUNT(*) AS n FROM schema_migrations',
    );
    expect(Number(applied.rows[0].n)).toBe(3);
  });

  describe('fingerprints', () => {
    const migration = {
      version: '0001_things',
      statements: ['CREATE TABLE IF NOT EXISTS things (id TEXT PRIMARY KEY)'],
    };
    const changed = {
      version: '0001_things',
      statements: [
        'CREATE TABLE IF NOT EXISTS things (id TEXT PRIMARY KEY, name TEXT)',
      ],
    };

    it('records a fingerprint of each migration it applies', async () => {
      const { client } = await freshDatabase();

      const rows = await client.execute(
        'SELECT version, fingerprint FROM schema_migrations ORDER BY version',
      );
      expect(rows.rows).toHaveLength(3);
      for (const row of rows.rows) {
        expect(String(row.fingerprint)).toMatch(/^[0-9a-f]{64}$/);
      }
      expect(rows.rows[0].fingerprint).toBe(
        await fingerprintOf(libsqlMigrations[0]),
      );
    });

    it('refuses a database whose applied migration has since changed', async () => {
      resetLibsqlClients();
      const client = createLibsqlClient(':memory:');
      await migrateLibsql(client, [migration]);

      const error = await migrateLibsql(client, [changed]).catch((e) => e);

      expect(error).toBeInstanceOf(StaleMigrationError);
      expect(error.version).toBe('0001_things');
      expect(error.message).toContain('has changed since');
      expect(error.message).toContain('.local-data/dev.db');
      // The unchanged migration is still fine.
      await expect(migrateLibsql(client, [migration])).resolves.toEqual([]);
    });

    it('refuses a database migrated before fingerprints were recorded', async () => {
      resetLibsqlClients();
      const client = createLibsqlClient(':memory:');
      // The tracking table as it was, with a migration applied under it.
      await client.execute(`CREATE TABLE schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`);
      await client.execute(migration.statements[0]);
      await client.execute(
        "INSERT INTO schema_migrations (version) VALUES ('0001_things')",
      );

      const error = await migrateLibsql(client, [migration]).catch((e) => e);

      expect(error).toBeInstanceOf(StaleMigrationError);
      expect(error.message).toContain('before migrations were fingerprinted');
      // The column is there now, so a fresh migration on it is recorded.
      await client.execute('DELETE FROM schema_migrations');
      await expect(migrateLibsql(client, [migration])).resolves.toEqual([
        '0001_things',
      ]);
    });

    it('ignores formatting-free changes: the fingerprint is of the statements', async () => {
      expect(await fingerprintOf(migration)).toBe(
        await fingerprintOf({ ...migration, version: 'renamed' }),
      );
      expect(await fingerprintOf(migration)).not.toBe(
        await fingerprintOf(changed),
      );
    });
  });
});

describe('libsql schema semantics', () => {
  it('enforces foreign keys, which SQLite leaves off by default', async () => {
    const { client } = await freshDatabase();
    await ensureForeignKeys(client);

    await expect(
      client.execute({
        sql: 'INSERT INTO skills (id, agent_id, name, description) VALUES (?, ?, ?, ?)',
        args: ['skill-x', 'no-such-agent', 'skill', 'orphan'],
      }),
    ).rejects.toThrow();
  });

  it('cascades deletes from agent to skill', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);

    await client.execute({
      sql: 'DELETE FROM agents WHERE id = ?',
      args: ['agent-1'],
    });

    const skills = await client.execute('SELECT id FROM skills');
    expect(skills.rows).toHaveLength(0);
  });

  it('sets updated_at on update, matching the Postgres trigger', async () => {
    const { client } = await freshDatabase();
    // Seeded through INSERT, which the AFTER UPDATE trigger does not see, so
    // the stale timestamp survives until the update below.
    await client.execute({
      sql: `INSERT INTO agents (id, name, description, updated_at)
            VALUES ('agent-1', 'a', 'd', '2000-01-01T00:00:00.000Z')`,
      args: [],
    });

    await client.execute({
      sql: 'UPDATE agents SET description = ? WHERE id = ?',
      args: ['changed', 'agent-1'],
    });
    const after = await client.execute('SELECT updated_at FROM agents');

    expect(String(after.rows[0].updated_at)).not.toBe(
      '2000-01-01T00:00:00.000Z',
    );
    // The trigger writes the same shape as Date.prototype.toISOString.
    expect(String(after.rows[0].updated_at)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('overwrites an explicitly supplied updated_at, as Postgres does', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);

    // `update_updated_at_column` assigns NEW.updated_at unconditionally, so a
    // caller cannot pin the column by passing a value.
    await client.execute({
      sql: "UPDATE agents SET updated_at = '2000-01-01T00:00:00.000Z' WHERE id = 'agent-1'",
      args: [],
    });

    const after = await client.execute('SELECT updated_at FROM agents');
    expect(String(after.rows[0].updated_at)).not.toBe(
      '2000-01-01T00:00:00.000Z',
    );
  });

  it('keeps system_settings a singleton', async () => {
    const { client } = await freshDatabase();

    // Migration 0003 seeds the one permitted row.
    const seeded = await client.execute(
      'SELECT COUNT(*) AS n FROM system_settings',
    );
    expect(Number(seeded.rows[0].n)).toBe(1);

    await expect(
      client.execute({
        sql: 'INSERT INTO system_settings (id) VALUES (?)',
        args: ['settings-2'],
      }),
    ).rejects.toThrow();
  });

  it('rejects an embedding model where a text model is required', async () => {
    const { client } = await freshDatabase();
    await client.execute({
      sql: 'INSERT INTO ai_providers (id, ai_provider, name) VALUES (?, ?, ?)',
      args: ['prov-1', 'openai', 'default'],
    });
    await client.execute({
      sql: `INSERT INTO models (id, ai_provider_id, model_name, model_type, embedding_dimensions)
            VALUES (?, ?, ?, 'embed', 1536)`,
      args: ['model-embed', 'prov-1', 'text-embedding-3-small'],
    });

    await expect(
      client.execute({
        sql: 'UPDATE system_settings SET judge_model_id = ?',
        args: ['model-embed'],
      }),
    ).rejects.toThrow(/judge_model_id must reference a text model/);
    await expect(
      client.execute({
        sql: 'UPDATE system_settings SET skill_arbiter_model_id = ?',
        args: ['model-embed'],
      }),
    ).rejects.toThrow(/skill_arbiter_model_id must reference a text model/);
    await expect(
      client.execute({
        sql: 'UPDATE system_settings SET intent_compaction_model_id = ?',
        args: ['model-embed'],
      }),
    ).rejects.toThrow(/intent_compaction_model_id must reference a text model/);

    // An agent's own arbiter override is held to the same rule.
    await seedAgentAndSkill(client);
    await expect(
      client.execute({
        sql: 'UPDATE agents SET skill_arbiter_model_id = ?',
        args: ['model-embed'],
      }),
    ).rejects.toThrow(/skill_arbiter_model_id must reference a text model/);
  });

  it('seeds the settings options as an empty document, and keeps it present', async () => {
    const { client } = await freshDatabase();

    // The timeouts and the judge's budget are not columns: they are keys of
    // this document, and a key the row lacks reads as its code default.
    const seeded = await client.execute('SELECT options FROM system_settings');
    expect(seeded.rows[0].options).toBe('{}');

    await expect(
      client.execute('UPDATE system_settings SET options = NULL'),
    ).rejects.toThrow();
  });

  it('requires embedding_dimensions exactly for embed models', async () => {
    const { client } = await freshDatabase();
    await client.execute({
      sql: 'INSERT INTO ai_providers (id, ai_provider, name) VALUES (?, ?, ?)',
      args: ['prov-1', 'openai', 'default'],
    });

    await expect(
      client.execute({
        sql: `INSERT INTO models (id, ai_provider_id, model_name, model_type)
              VALUES (?, ?, ?, 'embed')`,
        args: ['m1', 'prov-1', 'embed-no-dims'],
      }),
    ).rejects.toThrow();

    await expect(
      client.execute({
        sql: `INSERT INTO models (id, ai_provider_id, model_name, model_type, embedding_dimensions)
              VALUES (?, ?, ?, 'text', 512)`,
        args: ['m2', 'prov-1', 'text-with-dims'],
      }),
    ).rejects.toThrow();
  });

  it('constrains method and cache_status to the Postgres enum values', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);

    await expect(
      client.execute({
        sql: `INSERT INTO logs (
                id, agent_id, skill_id, method, endpoint, function_name, status,
                start_time, end_time, duration, base_sa_config, ai_provider, model,
                ai_provider_request_log, hook_logs, metadata, cache_status
              ) VALUES ('l1', 'agent-1', 'skill-1', 'TRACE', '/x', 'f', 200,
                        1, 2, 1, '{}', 'openai', 'gpt-5', '{}', '[]', '{}', 'MISS')`,
        args: [],
      }),
    ).rejects.toThrow();
  });
});

/**
 * The two views are the riskiest part of the port: Postgres reaches into the
 * `results` array with `CROSS JOIN LATERAL jsonb_array_elements`, and the
 * SQLite rewrite uses `json_each`. These check the arithmetic directly rather
 * than trusting the translation.
 */
describe('logs_with_eval_scores', () => {
  const seedEvaluations = async (client: Client) => {
    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluations
              (id, agent_id, skill_id, evaluation_method, weight)
            VALUES ('eval-a', 'agent-1', 'skill-1', 'task_completion', 3.0)`,
      args: [],
    });
    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluations
              (id, agent_id, skill_id, evaluation_method, weight)
            VALUES ('eval-b', 'agent-1', 'skill-1', 'latency', 1.0)`,
      args: [],
    });
  };

  it('computes a weighted average across evaluations', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);
    await seedEvaluations(client);
    await seedLog(client, 'log-1');

    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluation_runs
              (id, agent_id, skill_id, log_id, results)
            VALUES ('run-1', 'agent-1', 'skill-1', 'log-1', ?)`,
      args: [
        JSON.stringify([
          { evaluation_id: 'eval-a', score: 1.0 },
          { evaluation_id: 'eval-b', score: 0.0 },
        ]),
      ],
    });

    const result = await client.execute(
      'SELECT avg_eval_score, eval_run_count FROM logs_with_eval_scores WHERE id = ?'.replace(
        '?',
        "'log-1'",
      ),
    );

    // (1.0 * 3 + 0.0 * 1) / (3 + 1) = 0.75
    expect(Number(result.rows[0].avg_eval_score)).toBeCloseTo(0.75, 10);
    expect(Number(result.rows[0].eval_run_count)).toBe(1);
  });

  it('aggregates across multiple runs for one log', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);
    await seedEvaluations(client);
    await seedLog(client, 'log-1');

    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluation_runs
              (id, agent_id, skill_id, log_id, results)
            VALUES ('run-1', 'agent-1', 'skill-1', 'log-1', ?)`,
      args: [JSON.stringify([{ evaluation_id: 'eval-a', score: 1.0 }])],
    });
    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluation_runs
              (id, agent_id, skill_id, log_id, results)
            VALUES ('run-2', 'agent-1', 'skill-1', 'log-1', ?)`,
      args: [JSON.stringify([{ evaluation_id: 'eval-b', score: 0.5 }])],
    });

    const result = await client.execute(
      "SELECT avg_eval_score, eval_run_count FROM logs_with_eval_scores WHERE id = 'log-1'",
    );

    // (1.0 * 3 + 0.5 * 1) / 4 = 0.875
    expect(Number(result.rows[0].avg_eval_score)).toBeCloseTo(0.875, 10);
    expect(Number(result.rows[0].eval_run_count)).toBe(2);
  });

  it('reports NULL for a log with no evaluation runs', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);
    await seedLog(client, 'log-1');

    const result = await client.execute(
      "SELECT avg_eval_score, eval_run_count FROM logs_with_eval_scores WHERE id = 'log-1'",
    );

    expect(result.rows[0].avg_eval_score).toBeNull();
    expect(Number(result.rows[0].eval_run_count)).toBe(0);
  });

  it('ignores results whose evaluation no longer exists', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);
    await seedEvaluations(client);
    await seedLog(client, 'log-1');

    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluation_runs
              (id, agent_id, skill_id, log_id, results)
            VALUES ('run-1', 'agent-1', 'skill-1', 'log-1', ?)`,
      args: [
        JSON.stringify([
          { evaluation_id: 'eval-a', score: 1.0 },
          { evaluation_id: 'deleted-eval', score: 0.0 },
        ]),
      ],
    });

    const result = await client.execute(
      "SELECT avg_eval_score FROM logs_with_eval_scores WHERE id = 'log-1'",
    );

    // Only eval-a contributes, so the weighted average is 1.0 rather than 0.75.
    expect(Number(result.rows[0].avg_eval_score)).toBeCloseTo(1.0, 10);
  });

  it('exposes every column of logs alongside the computed ones', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);
    await seedLog(client, 'log-1');

    const view = await client.execute(
      "SELECT * FROM logs_with_eval_scores WHERE id = 'log-1'",
    );
    const table = await client.execute("SELECT * FROM logs WHERE id = 'log-1'");

    for (const column of Object.keys(table.rows[0])) {
      expect(Object.keys(view.rows[0])).toContain(column);
    }
    expect(Object.keys(view.rows[0])).toContain('avg_eval_score');
    expect(Object.keys(view.rows[0])).toContain('eval_run_count');
  });
});

describe('evaluation_runs_with_scores', () => {
  it('keys scores by evaluation method rather than id', async () => {
    const { client } = await freshDatabase();
    await seedAgentAndSkill(client);
    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluations
              (id, agent_id, skill_id, evaluation_method, weight)
            VALUES ('eval-a', 'agent-1', 'skill-1', 'task_completion', 2.0)`,
      args: [],
    });
    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluations
              (id, agent_id, skill_id, evaluation_method, weight)
            VALUES ('eval-b', 'agent-1', 'skill-1', 'latency', 2.0)`,
      args: [],
    });
    await seedLog(client, 'log-1');
    await client.execute({
      sql: `INSERT INTO skill_optimization_evaluation_runs
              (id, agent_id, skill_id, log_id, results)
            VALUES ('run-1', 'agent-1', 'skill-1', 'log-1', ?)`,
      args: [
        JSON.stringify([
          { evaluation_id: 'eval-a', score: 1.0 },
          { evaluation_id: 'eval-b', score: 0.6 },
        ]),
      ],
    });

    const result = await client.execute(
      'SELECT avg_score, scores_by_evaluation FROM evaluation_runs_with_scores',
    );

    expect(Number(result.rows[0].avg_score)).toBeCloseTo(0.8, 10);
    expect(JSON.parse(String(result.rows[0].scores_by_evaluation))).toEqual({
      task_completion: 1.0,
      latency: 0.6,
    });
  });
});

describe('libsql cache connector', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a value', async () => {
    const { c } = await freshDatabase();

    await libsqlCacheStorageConnector.setCache(c, 'k', 'cached-body');
    expect(await libsqlCacheStorageConnector.getCache(c, 'k')).toBe(
      'cached-body',
    );
  });

  it('returns null for a missing key', async () => {
    const { c } = await freshDatabase();
    expect(await libsqlCacheStorageConnector.getCache(c, 'absent')).toBeNull();
  });

  it('overwrites an existing key', async () => {
    const { c } = await freshDatabase();

    await libsqlCacheStorageConnector.setCache(c, 'k', 'first');
    await libsqlCacheStorageConnector.setCache(c, 'k', 'second');

    expect(await libsqlCacheStorageConnector.getCache(c, 'k')).toBe('second');
  });

  it('deletes a key', async () => {
    const { c } = await freshDatabase();

    await libsqlCacheStorageConnector.setCache(c, 'k', 'v');
    await libsqlCacheStorageConnector.deleteCache(c, 'k');

    expect(await libsqlCacheStorageConnector.getCache(c, 'k')).toBeNull();
  });

  it('sets the expiry one full TTL in the future', async () => {
    /**
     * Pins the TTL to the shared constant rather than merely checking that a
     * fresh entry reads back. Both connectors have to agree on how long a
     * cached response stays live -- the Supabase side once wrote `now`, which
     * expired every entry on write and turned its cache into a permanent miss
     * without failing anything.
     *
     * Only `Date` is faked; the database underneath is a real file and faking
     * timers wholesale would stall its I/O.
     */
    vi.useFakeTimers({ toFake: ['Date'] });
    const t0 = new Date('2026-03-01T12:00:00.000Z').getTime();
    vi.setSystemTime(t0);

    const { client, c } = await freshDatabase();
    await libsqlCacheStorageConnector.setCache(c, 'k', 'v');

    const stored = await client.execute({
      sql: 'SELECT expires_at FROM cache WHERE key = ?',
      args: ['k'],
    });

    expect(new Date(String(stored.rows[0].expires_at)).getTime()).toBe(
      t0 + CACHE_TTL_SECONDS * 1000,
    );
  });

  it('does not return an expired entry', async () => {
    const { client, c } = await freshDatabase();

    await client.execute({
      sql: 'INSERT INTO cache (key, value, expires_at) VALUES (?, ?, ?)',
      args: ['stale', 'v', '2000-01-01T00:00:00.000Z'],
    });

    expect(await libsqlCacheStorageConnector.getCache(c, 'stale')).toBeNull();
  });

  it('throws a directive error when LIBSQL_URL is unset', async () => {
    resetLibsqlClients();
    const c = { env: {} } as unknown as AppContext;

    await expect(libsqlCacheStorageConnector.getCache(c, 'k')).rejects.toThrow(
      /LIBSQL_URL is not set/,
    );
  });
});

describe('row mapping', () => {
  it('stores objects and arrays as JSON text', () => {
    expect(toJsonColumn({ a: 1 })).toBe('{"a":1}');
    expect(toJsonColumn([0.1, 0.2])).toBe('[0.1,0.2]');
    expect(toJsonColumn(undefined)).toBeNull();
    expect(toJsonColumn(null)).toBeNull();
  });

  it('round-trips JSON columns', () => {
    expect(fromJson(toJsonColumn({ a: [1, 2] }) as string)).toEqual({
      a: [1, 2],
    });
    expect(fromJson(null)).toBeNull();
    expect(fromJson('not json', { fallback: true })).toEqual({
      fallback: true,
    });
  });

  it('maps booleans onto 0 and 1', () => {
    expect(toBoolColumn(true)).toBe(1);
    expect(toBoolColumn(false)).toBe(0);
    expect(toBoolColumn(undefined)).toBeNull();
    expect(fromBool(1)).toBe(true);
    expect(fromBool(0)).toBe(false);
  });

  it('turns NULL into undefined and bigint into number', () => {
    const row = normaliseRow(
      {
        id: 'x',
        total_requests: 9007199254740990n,
        trace_id: null,
        metadata: '{"a":1}',
        optimize: 1,
      } as never,
      { json: ['metadata'], bool: ['optimize'] },
    );

    expect(row.id).toBe('x');
    expect(row.total_requests).toBe(9007199254740990);
    expect(row.trace_id).toBeNull();
    expect(row.metadata).toEqual({ a: 1 });
    expect(row.optimize).toBe(true);
  });

  it('omits undefined columns from an insert so defaults apply', () => {
    const { sql, args } = buildInsert('agents', {
      id: 'a',
      name: 'n',
      description: undefined,
    });

    expect(sql).toBe('INSERT INTO agents (id, name) VALUES (?, ?)');
    expect(args).toEqual(['a', 'n']);
  });

  it('omits undefined columns from an update', () => {
    const built = buildUpdate(
      'agents',
      { name: 'new', description: undefined },
      { column: 'id', value: 'a' },
    );

    expect(built?.sql).toBe('UPDATE agents SET name = ? WHERE id = ?');
    expect(built?.args).toEqual(['new', 'a']);
  });

  it('returns null when an update has nothing to set', () => {
    expect(
      buildUpdate('agents', { name: undefined }, { column: 'id', value: 'a' }),
    ).toBeNull();
  });
});
