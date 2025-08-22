import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/components/ui/tabs';
import { useDebounce } from '@client/hooks/use-debounce';
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import { useLogs } from '@client/providers/logs';
import type { DataPoint, DataPointCreateParams } from '@shared/types/data';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogFiltersPanel } from './log-filters-panel';
import { LogSearchControls } from './log-search-controls';
import { LogsList } from './logs-list';
import { SelectedLogsFooter } from './selected-logs-footer';

interface AddDataPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  existingDataPoints: DataPoint[];
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

export function AddDataPointsDialog({
  open,
  onOpenChange,
  datasetId,
  existingDataPoints,
}: AddDataPointsDialogProps): React.ReactElement {
  const { logs, isLoading, error } = useLogs();
  const { addDataPoints } = useDatasets();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    methods: [],
    statusCodes: [],
    endpoints: '',
    functionNames: [],
    aiProviders: [],
    models: [],
    hasRequestBody: undefined,
    hasResponseBody: undefined,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedLogs(new Set());
      setFilters({
        methods: [],
        statusCodes: [],
        endpoints: '',
        functionNames: [],
        aiProviders: [],
        models: [],
        hasRequestBody: undefined,
        hasResponseBody: undefined,
      });
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsCreating(false);
    }
  }, [open]);

  // Helper function for status categorization
  const getStatusCategory = useCallback((status: number): string => {
    if (status >= 200 && status < 300) return '2xx Success';
    if (status >= 300 && status < 400) return '3xx Redirect';
    if (status >= 400 && status < 500) return '4xx Client Error';
    if (status >= 500) return '5xx Server Error';
    return 'Other';
  }, []);

  // Create a set of existing data point log_ids for efficient lookup
  const existingLogIds = useMemo(
    () =>
      new Set(
        existingDataPoints
          .map((dp) => (dp.metadata as Record<string, unknown>)?.log_id)
          .filter((v): v is string => typeof v === 'string'),
      ),
    [existingDataPoints],
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
      aiProviders: Array.from(
        new Set(logs.map((log) => log.ai_provider).filter(Boolean)),
      ),
      models: Array.from(new Set(logs.map((log) => log.model).filter(Boolean))),
    };
  }, [logs, getStatusCategory]);

  // Optimized filtering with debounced search and memoization
  const filteredLogs = useMemo(() => {
    if (!logs) return undefined;

    return logs.filter((log) => {
      // Skip logs that are already data points
      if (existingLogIds.has(log.id)) {
        return false;
      }

      // Text search filter
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        const matchesSearch =
          log.endpoint.toLowerCase().includes(searchLower) ||
          log.function_name.toLowerCase().includes(searchLower) ||
          log.method.toLowerCase().includes(searchLower) ||
          (log.ai_provider?.toLowerCase().includes(searchLower) ?? false) ||
          (log.model?.toLowerCase().includes(searchLower) ?? false);

        if (!matchesSearch) return false;
      }

      // Apply filters
      if (filters.methods.length > 0 && !filters.methods.includes(log.method)) {
        return false;
      }

      if (filters.statusCodes.length > 0) {
        const statusCategory = getStatusCategory(log.status);
        const statusString = log.status.toString();
        if (
          !filters.statusCodes.includes(statusCategory) &&
          !filters.statusCodes.includes(statusString)
        ) {
          return false;
        }
      }

      if (
        filters.endpoints &&
        !log.endpoint.toLowerCase().includes(filters.endpoints.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.functionNames.length > 0 &&
        !filters.functionNames.includes(log.function_name)
      ) {
        return false;
      }

      if (
        filters.aiProviders.length > 0 &&
        !filters.aiProviders.includes(log.ai_provider || '')
      ) {
        return false;
      }

      if (
        filters.models.length > 0 &&
        !filters.models.includes(log.model || '')
      ) {
        return false;
      }

      if (
        filters.minDuration !== undefined &&
        log.duration < filters.minDuration
      ) {
        return false;
      }

      if (
        filters.maxDuration !== undefined &&
        log.duration > filters.maxDuration
      ) {
        return false;
      }

      if (filters.dateFrom) {
        const logDate = new Date(log.start_time).toISOString().split('T')[0];
        if (logDate < filters.dateFrom) return false;
      }

      if (filters.dateTo) {
        const logDate = new Date(log.start_time).toISOString().split('T')[0];
        if (logDate > filters.dateTo) return false;
      }

      // Request body filter
      if (
        filters.hasRequestBody === true &&
        !log.ai_provider_request_log?.request_body
      ) {
        return false;
      }

      // Response body filter
      if (
        filters.hasResponseBody === true &&
        !log.ai_provider_request_log?.response_body
      ) {
        return false;
      }

      return true;
    });
  }, [logs, existingLogIds, debouncedSearchQuery, filters, getStatusCategory]);

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
      hasRequestBody: undefined,
      hasResponseBody: undefined,
    });
  }, []);

  const handleAddDataPoints = async () => {
    if (!logs || selectedLogs.size === 0) return;

    // Create a new AbortController for this operation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsCreating(true);
    try {
      const selectedLogsData = logs.filter((log) => selectedLogs.has(log.id));

      const dataPointsToCreate: DataPointCreateParams[] = selectedLogsData.map(
        (log) => ({
          method: log.method,
          endpoint: log.endpoint,
          function_name: log.function_name,
          request_body: log.ai_provider_request_log?.request_body || {},
          ground_truth: log.ai_provider_request_log?.response_body || null,
          is_golden: false,
          metadata: {
            log_id: log.id,
            status: log.status,
            duration: log.duration,
            start_time: log.start_time,
            end_time: log.end_time,
            ai_provider: log.ai_provider,
            model: log.model,
            ...(log.metadata || {}),
          },
        }),
      );

      // Check if operation was aborted before making the API call
      if (abortController.signal.aborted) {
        return;
      }

      await addDataPoints(datasetId, dataPointsToCreate, {
        signal: abortController.signal,
      });

      // Check if operation was aborted after the API call
      if (abortController.signal.aborted) {
        return;
      }

      toast({
        title: 'Data points added',
        description: `Successfully added ${dataPointsToCreate.length} data points to the dataset`,
      });

      onOpenChange(false);
    } catch (error) {
      // Check if error is due to abortion
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Silently handle abort
      }

      console.error('Failed to add data points:', error);
      if (!abortController.signal.aborted) {
        toast({
          variant: 'destructive',
          title: 'Error adding data points',
          description: 'Please try again later',
        });
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsCreating(false);
      }
      // Clear the abort controller reference
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.methods.length > 0 ||
    filters.statusCodes.length > 0 ||
    filters.endpoints.trim() !== '' ||
    filters.functionNames.length > 0 ||
    filters.aiProviders.length > 0 ||
    filters.models.length > 0 ||
    filters.minDuration !== undefined ||
    filters.maxDuration !== undefined ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    filters.hasRequestBody !== undefined ||
    filters.hasResponseBody !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Data Points
          </DialogTitle>
          <DialogDescription>
            Select logs to convert into data points for this dataset. Logs
            already converted to data points are automatically filtered out.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="from-logs" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-1 shrink-0">
            <TabsTrigger value="from-logs">From Logs</TabsTrigger>
          </TabsList>

          <TabsContent
            value="from-logs"
            className="space-y-4 flex-1 flex flex-col min-h-0"
          >
            <LogSearchControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedLogs={selectedLogs}
              filteredLogs={filteredLogs}
              onSelectAll={handleSelectAll}
              onReset={handleReset}
            />

            <LogFiltersPanel
              filters={filters}
              uniqueValues={uniqueValues}
              filtersOpen={filtersOpen}
              hasActiveFilters={hasActiveFilters}
              onFiltersOpenChange={setFiltersOpen}
              onFiltersChange={setFilters}
              onReset={handleReset}
            />

            <LogsList
              filteredLogs={filteredLogs}
              selectedLogs={selectedLogs}
              isLoading={isLoading}
              error={error}
              searchQuery={searchQuery}
              onLogToggle={handleLogToggle}
            />

            <SelectedLogsFooter selectedLogs={selectedLogs} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddDataPoints}
            disabled={selectedLogs.size === 0 || isCreating}
          >
            {isCreating
              ? 'Adding...'
              : `Add ${selectedLogs.size} Data Point${selectedLogs.size === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
