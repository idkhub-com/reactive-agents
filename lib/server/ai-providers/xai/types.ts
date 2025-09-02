// xAI API types and interfaces
export interface XaiErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// xAI-specific search parameters
export interface XaiSearchParameters {
  max_sources?: number;
  recency_filter?: 'none' | 'day' | 'week' | 'month';
  include_domains?: string[];
  exclude_domains?: string[];
}

// xAI-specific web search options
export interface XaiWebSearchOptions {
  max_sources?: number;
  search_strategy?: 'auto' | 'comprehensive' | 'focused';
}
