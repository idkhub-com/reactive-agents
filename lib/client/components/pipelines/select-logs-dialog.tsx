import { ErrorBoundary } from '@client/components/error-boundary';
import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Tabs, TabsContent } from '@client/components/ui/tabs';
import { useDebounce } from '@client/hooks/use-debounce';
import { useLogs } from '@client/providers/logs';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogFiltersPanel } from '../datasets-view/components/log-filters-panel';
import { LogSearchControls } from '../datasets-view/components/log-search-controls';
import { LogsList } from '../datasets-view/components/logs-list';
import { SelectedLogsFooter } from '../datasets-view/components/selected-logs-footer';

interface SelectLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLogs: (logs: IdkRequestLog[]) => void;
  alreadySelectedLogs: IdkRequestLog[];
}

interface LogFilters {
  methods: string[];
  statusCodes: string[];
  endpoints: string;
  functionNames: string[];
  aiProviders: string[];
  models: string[];
  minDuration?: number;
  maxDuration?: number;
  dateFrom?: string;
  dateTo?: string;
  hasRequestBody?: boolean;
  hasResponseBody?: boolean;
}

// Helper functions for filtering logic
const matchesSearchQuery = (log: IdkRequestLog, query: string): boolean => {
  if (!query) return true;

  const searchableText = [
    log.method,
    log.endpoint,
    log.function_name,
    log.ai_provider,
    log.model,
    log.status.toString(),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(query.toLowerCase());
};

const matchesMethodFilter = (
  log: IdkRequestLog,
  methods: string[],
): boolean => {
  return methods.length === 0 || methods.includes(log.method);
};

const matchesStatusFilter = (
  log: IdkRequestLog,
  statusCodes: string[],
  getStatusCategory: (status: number) => string,
): boolean => {
  if (statusCodes.length === 0) return true;

  const statusCategory = getStatusCategory(log.status);
  const statusString = log.status.toString();
  return (
    statusCodes.includes(statusCategory) || statusCodes.includes(statusString)
  );
};

const matchesEndpointFilter = (
  log: IdkRequestLog,
  endpoint: string,
): boolean => {
  return (
    !endpoint || log.endpoint.toLowerCase().includes(endpoint.toLowerCase())
  );
};

const matchesFunctionFilter = (
  log: IdkRequestLog,
  functionNames: string[],
): boolean => {
  return (
    functionNames.length === 0 || functionNames.includes(log.function_name)
  );
};

const matchesProviderFilter = (
  log: IdkRequestLog,
  aiProviders: string[],
): boolean => {
  return aiProviders.length === 0 || aiProviders.includes(log.ai_provider);
};

const matchesModelFilter = (log: IdkRequestLog, models: string[]): boolean => {
  return models.length === 0 || models.includes(log.model);
};

const matchesDurationFilter = (
  log: IdkRequestLog,
  minDuration?: number,
  maxDuration?: number,
): boolean => {
  if (minDuration && log.duration < minDuration) return false;
  if (maxDuration && log.duration > maxDuration) return false;
  return true;
};

const matchesDateFilter = (
  log: IdkRequestLog,
  dateFrom?: string,
  dateTo?: string,
): boolean => {
  const logDate = new Date(log.start_time);

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (logDate < fromDate) return false;
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    if (logDate > toDate) return false;
  }

  return true;
};

const matchesBodyFilters = (
  log: IdkRequestLog,
  hasRequestBody?: boolean,
  hasResponseBody?: boolean,
): boolean => {
  if (hasRequestBody === true && !log.ai_provider_request_log?.request_body) {
    return false;
  }

  if (hasResponseBody === true && !log.ai_provider_request_log?.response_body) {
    return false;
  }

  return true;
};

export function SelectLogsDialog({
  open,
  onOpenChange,
  onSelectLogs,
  alreadySelectedLogs,
}: SelectLogsDialogProps): React.ReactElement {
  const { queryLogs, logs, isLoading, error } = useLogs();
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    methods: [],
    statusCodes: [],
    endpoints: '',
    functionNames: [],
    aiProviders: [],
    models: [],
    minDuration: undefined,
    maxDuration: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    hasRequestBody: undefined,
    hasResponseBody: undefined,
  });

  // Load logs when dialog opens
  useEffect(() => {
    if (open) {
      queryLogs({
        limit: 100,
        offset: 0,
      });
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [open, queryLogs]);

  // Helper function for status categorization
  const getStatusCategory = useCallback((status: number): string => {
    if (status >= 200 && status < 300) return '2xx Success';
    if (status >= 300 && status < 400) return '3xx Redirect';
    if (status >= 400 && status < 500) return '4xx Client Error';
    if (status >= 500) return '5xx Server Error';
    return 'Other';
  }, []);

  // Create a set of already selected log IDs for efficient lookup
  const alreadySelectedLogIds = useMemo(
    () => new Set(alreadySelectedLogs.map((log) => log.id)),
    [alreadySelectedLogs],
  );

  // Memoize unique values extraction for filter options
  const uniqueValues = useMemo(() => {
    if (!logs)
      return {
        methods: [],
        statusCodes: [],
        functionNames: [],
        aiProviders: [],
        models: [],
      };

    return {
      methods: Array.from(new Set(logs.map((log) => log.method))),
      statusCodes: Array.from(
        new Set([
          ...logs.map((log) => getStatusCategory(log.status)),
          ...logs.map((log) => log.status.toString()),
        ]),
      ),
      functionNames: Array.from(new Set(logs.map((log) => log.function_name))),
      aiProviders: Array.from(new Set(logs.map((log) => log.ai_provider))),
      models: Array.from(new Set(logs.map((log) => log.model))),
    };
  }, [logs, getStatusCategory]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.methods.length > 0 ||
      filters.statusCodes.length > 0 ||
      filters.endpoints.length > 0 ||
      filters.functionNames.length > 0 ||
      filters.aiProviders.length > 0 ||
      filters.models.length > 0 ||
      filters.minDuration !== undefined ||
      filters.maxDuration !== undefined ||
      filters.dateFrom !== undefined ||
      filters.dateTo !== undefined ||
      filters.hasRequestBody !== undefined ||
      filters.hasResponseBody !== undefined
    );
  }, [filters]);

  // Filter logs based on search query and filters
  const filteredLogs = useMemo(() => {
    if (!logs) return undefined;

    return logs.filter((log) => {
      // Exclude already selected logs
      if (alreadySelectedLogIds.has(log.id)) {
        return false;
      }

      // Apply all filter checks using helper functions
      return (
        matchesSearchQuery(log, debouncedSearchQuery) &&
        matchesMethodFilter(log, filters.methods) &&
        matchesStatusFilter(log, filters.statusCodes, getStatusCategory) &&
        matchesEndpointFilter(log, filters.endpoints) &&
        matchesFunctionFilter(log, filters.functionNames) &&
        matchesProviderFilter(log, filters.aiProviders) &&
        matchesModelFilter(log, filters.models) &&
        matchesDurationFilter(log, filters.minDuration, filters.maxDuration) &&
        matchesDateFilter(log, filters.dateFrom, filters.dateTo) &&
        matchesBodyFilters(log, filters.hasRequestBody, filters.hasResponseBody)
      );
    });
  }, [
    logs,
    alreadySelectedLogIds,
    debouncedSearchQuery,
    filters,
    getStatusCategory,
  ]);

  const handleLogToggle = useCallback(
    (logId: string) => {
      const newSelected = new Set(selectedLogs);
      if (newSelected.has(logId)) {
        newSelected.delete(logId);
      } else {
        newSelected.add(logId);
      }
      setSelectedLogs(newSelected);
    },
    [selectedLogs],
  );

  const handleSelectAll = useCallback(() => {
    if (!filteredLogs) return;

    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map((log) => log.id)));
    }
  }, [filteredLogs, selectedLogs]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedLogs(new Set());
    setFilters({
      methods: [],
      statusCodes: [],
      endpoints: '',
      functionNames: [],
      aiProviders: [],
      models: [],
      minDuration: undefined,
      maxDuration: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      hasRequestBody: undefined,
      hasResponseBody: undefined,
    });
  }, []);

  const handleAddSelected = () => {
    if (!logs || selectedLogs.size === 0) return;

    const selectedLogsData = logs.filter((log) => selectedLogs.has(log.id));
    onSelectLogs(selectedLogsData);

    // Reset selection and close dialog
    setSelectedLogs(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Logs</DialogTitle>
          <DialogDescription>
            Choose request logs to include in your dataset
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ErrorBoundary
            fallback={(error) => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-destructive mb-2">
                    Failed to load logs
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {error.message}
                  </p>
                </div>
              </div>
            )}
          >
            <Tabs defaultValue="browse" className="h-full flex flex-col">
              <TabsContent value="browse" className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col gap-4">
                  <LogSearchControls
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedLogs={selectedLogs}
                    filteredLogs={filteredLogs}
                    onSelectAll={handleSelectAll}
                    onReset={handleReset}
                  />

                  <div className="flex flex-col gap-4 min-h-0">
                    <LogFiltersPanel
                      filters={filters}
                      onFiltersChange={setFilters}
                      uniqueValues={uniqueValues}
                      filtersOpen={filtersOpen}
                      hasActiveFilters={hasActiveFilters}
                      onFiltersOpenChange={setFiltersOpen}
                      onReset={handleReset}
                    />

                    <LogsList
                      filteredLogs={filteredLogs}
                      selectedLogs={selectedLogs}
                      isLoading={isLoading}
                      error={error}
                      searchQuery={debouncedSearchQuery}
                      onLogToggle={handleLogToggle}
                    />
                  </div>

                  <SelectedLogsFooter selectedLogs={selectedLogs} />
                </div>
              </TabsContent>
            </Tabs>
          </ErrorBoundary>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedLogs.size === 0}
          >
            Add {selectedLogs.size} Log
            {selectedLogs.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
