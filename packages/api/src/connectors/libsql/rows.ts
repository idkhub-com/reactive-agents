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
 * Parse a JSON column. NULL stays `null`, which is what PostgREST returns for
 * a NULL `jsonb` column and therefore what the Zod schemas expect.
 */
export const fromJson = <T>(value: unknown, fallback?: T): T | undefined => {
  if (value === null || value === undefined) {
    return fallback === undefined ? (null as T) : fallback;
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
 * Normalise a raw row: `bigint` to `number`, everything else as stored.
 *
 * NULL is deliberately preserved rather than mapped to `undefined`: PostgREST
 * serialises a NULL column as JSON `null`, so the Zod schemas are written with
 * `.nullable()` and would reject `undefined`. Columns that need JSON or boolean
 * decoding are named by the caller.
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
      out[key] = value === null || value === undefined ? null : fromBool(value);
      continue;
    }
    if (value === null || value === undefined) {
      out[key] = null;
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

/**
 * Coerce a plain object into bindable column values.
 *
 * Used where a create or update object is spread into a statement: strings and
 * numbers pass through, booleans become 0/1, and anything structural is
 * stringified for the JSON TEXT column it belongs to. `undefined` survives so
 * the query builders can drop the column and let its default apply.
 */
export const asColumns = (
  values: Record<string, unknown>,
): Record<string, InValue | undefined> => {
  const out: Record<string, InValue | undefined> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      out[key] = undefined;
    } else if (value === null) {
      out[key] = null;
    } else if (typeof value === 'boolean') {
      out[key] = value ? 1 : 0;
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint'
    ) {
      out[key] = value;
    } else {
      out[key] = JSON.stringify(value);
    }
  }

  return out;
};
