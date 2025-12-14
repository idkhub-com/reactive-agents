import {
  POSTGREST_SERVICE_ROLE_KEY,
  POSTGREST_URL,
  SUPABASE_SECRET_KEY,
} from '@server/constants';
import type { z } from 'zod';

const checkEnvironmentVariables = (): void => {
  if (!POSTGREST_SERVICE_ROLE_KEY) {
    throw new Error('POSTGREST_SERVICE_ROLE_KEY is not set');
  }
  if (!POSTGREST_URL) {
    throw new Error('POSTGREST_URL is not set');
  }
};

export const selectFromSupabase = async <T extends z.ZodType>(
  table: string,
  queryParams: Record<string, string | undefined>,
  schema: T,
): Promise<z.infer<T>> => {
  checkEnvironmentVariables();

  const url = new URL(`${POSTGREST_URL}/${table}`);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${POSTGREST_SERVICE_ROLE_KEY}`,
  };

  if (SUPABASE_SECRET_KEY) {
    headers.apiKey = SUPABASE_SECRET_KEY;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to fetch from PostgREST:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  const data = await response.json();
  try {
    const parsedData = schema.parse(data);
    return parsedData;
  } catch (error) {
    throw new Error(`Failed to parse data from PostgREST: ${error}`);
  }
};

export const insertIntoSupabase = async <
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType | null,
>(
  table: string,
  data: z.infer<InputSchema>,
  schema: OutputSchema,
  upsert = false,
): Promise<
  // If schema is not provided, return void
  OutputSchema extends z.ZodType ? z.infer<OutputSchema> : void
> => {
  checkEnvironmentVariables();

  const url = new URL(`${POSTGREST_URL}/${table}`);

  const preferArr = [];

  if (upsert) {
    preferArr.push('resolution=merge-duplicates');
  }

  if (schema) {
    preferArr.push('return=representation');
  }

  const prefer = preferArr.join(', ');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${POSTGREST_SERVICE_ROLE_KEY}`,
    Prefer: prefer,
  };

  if (SUPABASE_SECRET_KEY) {
    headers.apiKey = SUPABASE_SECRET_KEY;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to insert into PostgREST:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  if (!schema) {
    return undefined as OutputSchema extends z.ZodType ? never : undefined;
  }

  const rawInsertedData = await response.json();
  try {
    return schema.parse(rawInsertedData) as OutputSchema extends z.ZodType
      ? never
      : undefined;
  } catch (error) {
    throw new Error(`Failed to parse data from PostgREST: ${error}`);
  }
};

export const updateInSupabase = async <
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType,
>(
  table: string,
  id: string,
  data: z.infer<InputSchema>,
  schema: OutputSchema | null,
): Promise<
  // If schema is not provided, return void
  OutputSchema extends z.ZodType ? z.infer<OutputSchema> : void
> => {
  checkEnvironmentVariables();

  const url = new URL(`${POSTGREST_URL}/${table}`);
  url.searchParams.set('id', `eq.${id}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${POSTGREST_SERVICE_ROLE_KEY}`,
    Prefer: 'return=representation',
  };
  if (SUPABASE_SECRET_KEY) {
    headers.apiKey = SUPABASE_SECRET_KEY;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to update in PostgREST:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  const rawUpdatedData = await response.json();
  try {
    if (!schema) {
      return undefined as OutputSchema extends z.ZodType ? never : undefined;
    }
    return schema.parse(rawUpdatedData) as OutputSchema extends z.ZodType
      ? never
      : undefined;
  } catch (error) {
    throw new Error(`Failed to parse data from PostgREST: ${error}`);
  }
};

export const deleteFromSupabase = async (
  table: string,
  params: Record<string, string>,
): Promise<void> => {
  checkEnvironmentVariables();

  const url = new URL(`${POSTGREST_URL}/${table}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${POSTGREST_SERVICE_ROLE_KEY}`,
  };

  if (SUPABASE_SECRET_KEY) {
    headers.apiKey = SUPABASE_SECRET_KEY;
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to delete from PostgREST:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }
};

export const rpcFunction = async (
  functionName: string,
  params: Record<string, string>,
): Promise<void> => {
  checkEnvironmentVariables();

  const url = new URL(`${POSTGREST_URL}/rpc/${functionName}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${POSTGREST_SERVICE_ROLE_KEY}`,
  };

  if (SUPABASE_SECRET_KEY) {
    headers.apiKey = SUPABASE_SECRET_KEY;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to call RPC function:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }
};

export const rpcFunctionWithResponse = async <T extends z.ZodType>(
  functionName: string,
  params: Record<string, unknown>,
  schema: T,
): Promise<z.Infer<T>> => {
  checkEnvironmentVariables();

  const url = new URL(`${POSTGREST_URL}/rpc/${functionName}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${POSTGREST_SERVICE_ROLE_KEY}`,
  };

  if (SUPABASE_SECRET_KEY) {
    headers.apiKey = SUPABASE_SECRET_KEY;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to fetch from PostgREST:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  const data = await response.json();
  try {
    const parsedData = schema.parse(data);
    return parsedData;
  } catch (error) {
    throw new Error(
      `Failed to parse data from PostgREST function ${functionName} output: ${error}`,
    );
  }
};
