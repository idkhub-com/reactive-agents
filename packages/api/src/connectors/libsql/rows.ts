import type { InValue, Row } from '@libsql/client';

/**
 * Conversions between SQLite storage types and the shapes the Zod schemas in
 * `@shared/types/data` expect.
 *
 * Postgres gives PostgREST typed JSON: `jsonb` arrives parsed, `boolean` as a
 * boolean, `timestamptz` as an ISO string. SQLite has none of those types, so
 * everything is stored as TEXT/INTEGER/REAL and reconstituted here. Keeping
 * that in one place means a column's storage decision and its read path cannot
 * drift apart.
 */

/** Timestamp format written by the schema's triggers and defaults. */
export const nowIso = (): string => new Date().toISOString();

// ----------------------------------------------------------------- to SQLite

/** JSON columns: objects, arrays, and the `TEXT[]`/`FLOAT[]` translations. */
export const toJsonColumn = (value: unknown): InValue => {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.stringify(value);
};

/** SQLite has no boolean type; the schema's CHECK constraints pin it to 0/1. */
export const toBoolColumn = (value: boolean | undefined | null): InValue => {
  if (value === undefined || value === null) {
    return null;
  }
  return value ? 1 : 0;
};

// --------------------------------------------------------------- from SQLite

/**
 * Parse a JSON column.
 *
 * Returns `fallback` for NULL so that a nullable JSON column reads as
 * `undefined` rather than `null`, matching what the Zod schemas accept for
 * optional fields.
 */
export const fromJson = <T>(value: unknown, fallback?: T): T | undefined => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string') {
    // libSQL can hand back an already-decoded value for some drivers.
    return value as T;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const fromBool = (value: unknown): boolean =>
  value === 1 || value === true;

/**
 * Normalise a raw row: `bigint` to `number`, and NULL to `undefined`.
 *
 * The Zod schemas mark absent fields `.optional()` rather than `.nullable()`,
 * so a NULL column has to arrive as `undefined` or parsing fails. Columns that
 * need JSON or boolean decoding are named by the caller.
 */
export const normaliseRow = (
  row: Row,
  options: { json?: string[]; bool?: string[] } = {},
): Record<string, unknown> => {
  const json = new Set(options.json ?? []);
  const bool = new Set(options.bool ?? []);
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (json.has(key)) {
      out[key] = fromJson(value);
      continue;
    }
    if (bool.has(key)) {
      out[key] =
        value === null || value === undefined ? undefined : fromBool(value);
      continue;
    }
    if (value === null || value === undefined) {
      out[key] = undefined;
      continue;
    }
    out[key] = typeof value === 'bigint' ? Number(value) : value;
  }

  return out;
};

/**
 * Build the column list, placeholders and bound values for an INSERT.
 *
 * Keys whose value is `undefined` are dropped so the column's DEFAULT applies,
 * which is how PostgREST behaves when a field is omitted from the body.
 */
export const buildInsert = (
  table: string,
  values: Record<string, InValue | undefined>,
): { sql: string; args: InValue[] } => {
  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined,
  ) as [string, InValue][];

  const columns = entries.map(([key]) => key);
  const placeholders = columns.map(() => '?');

  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    args: entries.map(([, value]) => value),
  };
};

/**
 * Build the SET clause for an UPDATE, dropping keys the caller did not provide.
 *
 * Returns `null` when nothing is left to update, so callers can skip the write
 * rather than emitting `SET` with no assignments.
 */
export const buildUpdate = (
  table: string,
  values: Record<string, InValue | undefined>,
  where: { column: string; value: InValue },
): { sql: string; args: InValue[] } | null => {
  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined,
  ) as [string, InValue][];

  if (entries.length === 0) {
    return null;
  }

  const assignments = entries.map(([key]) => `${key} = ?`);

  return {
    sql: `UPDATE ${table} SET ${assignments.join(', ')} WHERE ${where.column} = ?`,
    args: [...entries.map(([, value]) => value), where.value],
  };
};
