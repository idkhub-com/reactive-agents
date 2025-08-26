import { z } from 'zod';

export enum CacheMode {
  DISABLED = 'disabled',
  SIMPLE = 'simple',
  SEMANTIC = 'semantic',
}

export const CacheSettings = z.object({
  mode: z.enum(CacheMode),
  max_age: z.number().default(604800).optional(),
});

export type CacheSettings = z.infer<typeof CacheSettings>;

export enum CacheStatus {
  HIT = 'HIT',
  SEMANTIC_HIT = 'SEMANTIC_HIT',
  MISS = 'MISS',
  SEMANTIC_MISS = 'SEMANTIC_MISS',
  REFRESH = 'REFRESH',
  DISABLED = 'DISABLED',
}

export interface FinalCacheSettings {
  mode: CacheMode;
  maxAge: number;
  status: CacheStatus;
}

export interface CacheHandlerResult {
  response?: Response;
  status: CacheStatus;
  createdAt: Date;
  executionTime: number;
  key?: string;
}

export const CachedValue = z.object({
  key: z.string(),
  value: z.string(),
  expires_at: z.string(),
});

export type CachedValue = z.infer<typeof CachedValue>;

export interface CacheQueryParams {
  key: string;
  expires_at: string;
}

// Key and value are only present if status is HIT
export type GetFromCacheResult =
  | {
      status: CacheStatus.HIT;
      key: string;
      value: string;
    }
  | {
      status: CacheStatus.SEMANTIC_HIT;
      key: string;
      value: string;
    }
  | {
      status: CacheStatus.MISS;
    }
  | {
      status: CacheStatus.SEMANTIC_MISS;
    }
  | {
      status: CacheStatus.DISABLED;
    }
  | {
      status: CacheStatus.REFRESH;
    };
