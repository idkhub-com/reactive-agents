'use client';
import { type Log, LogsQueryParams } from '@shared/types/data/log';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryLogs } from '@web/api/v1/super-agents/observability/logs';
import { useToast } from '@web/hooks/use-toast';
import { useNavigation } from '@web/providers/navigation';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface LogsContextType {
  // Query state
  logs: Log[];
  selectedLog?: Log;
  /**
   * The logs on either side of the selected one in the list's order (newest
   * first): `newerLog` is the row above it, `olderLog` the row below. Looked
   * up by time within the current scope, so they are found across pages and
   * from a deep link.
   */
  newerLog?: Log;
  olderLog?: Log;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Agent/Skill IDs
  agentId: string | null;
  setAgentId: (agentId: string | null) => void;
  skillId: string | null;
  setSkillId: (skillId: string | null) => void;
  /**
   * When true, logs are fetched for the whole agent and skillId is ignored.
   * The logs page sets it on mount: on for the whole agent, off when
   * narrowed to a skill; a skill's dashboard turns it off for its recent
   * logs. The log detail view leaves it as it found it, so stepping between
   * logs follows the list the log was opened from.
   */
  agentWide: boolean;
  setAgentWide: (agentWide: boolean) => void;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // Helper functions
  getLogById: (id: string) => Log | undefined;
  refreshLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

// Query keys for React Query caching
export const logsQueryKeys = {
  all: ['logs'] as const,
  lists: () => [...logsQueryKeys.all, 'list'] as const,
  list: (
    agentId: string | null,
    skillId: string | null,
    agentWide: boolean,
    page: number,
    pageSize: number,
  ) =>
    [
      ...logsQueryKeys.lists(),
      agentId,
      skillId,
      agentWide,
      page,
      pageSize,
    ] as const,
  detail: (logId: string | undefined) =>
    [...logsQueryKeys.all, 'detail', logId] as const,
  neighbors: (
    agentId: string | null,
    skillId: string | null,
    agentWide: boolean,
    logId: string | undefined,
  ) =>
    [
      ...logsQueryKeys.all,
      'neighbors',
      agentId,
      skillId,
      agentWide,
      logId,
    ] as const,
};

export const LogsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const { toast } = useToast();
  const { navigationState } = useNavigation();
  const queryClient = useQueryClient();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [agentWide, setAgentWide] = useState(false);
  const [page, setPage] = useState(1); // Pages are 1-indexed for display
  const [pageSize, setPageSize] = useState(50);

  // Agent-wide, the skill is not part of the scope: the detail view still
  // names the skill of the log it shows, and that must not count as a scope
  // change, or going back to the agent's logs would land on page 1
  const scopedSkillId = agentWide ? null : skillId;

  // Reset page to 1 when the scope changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally reset page when the scope changes
  useEffect(() => {
    setPage(1);
  }, [agentId, scopedSkillId, agentWide]);

  // The filter the list and the neighbor lookups share: a skill, or the
  // whole agent when the view asks for it; null until a view has set one
  const scope = useMemo(() => {
    if (!agentId || (!scopedSkillId && !agentWide)) return null;
    return {
      agent_id: agentId,
      ...(scopedSkillId ? { skill_id: scopedSkillId } : {}),
    };
  }, [agentId, scopedSkillId, agentWide]);

  // Logs query with pagination
  const {
    data: logs = [],
    isLoading: isListLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: logsQueryKeys.list(
      agentId,
      scopedSkillId,
      agentWide,
      page,
      pageSize,
    ),
    queryFn: async () => {
      if (!scope) return [];
      const offset = (page - 1) * pageSize;
      return await queryLogs(
        LogsQueryParams.parse({
          ...scope,
          limit: String(pageSize),
          offset: String(offset),
        }),
      );
    },
    enabled: !!scope,
  });

  // Calculate total pages (approximate based on current page results)
  const totalPages = useMemo(() => {
    if (logs.length < pageSize) {
      // If we got fewer results than pageSize, this is the last page
      return page;
    }
    // We don't know the exact total, but we know there's at least one more page
    // This is a limitation of offset-based pagination without total count
    return page + 1;
  }, [logs.length, page, pageSize]);

  // Resolve selectedLog from navigationState.logId. The list only holds the
  // current page, so a log reached from elsewhere -- a deep link, or a row
  // on a later page of the agent-wide view -- is fetched by id instead.
  const listedLog = useMemo(() => {
    if (!navigationState.logId) return undefined;
    return logs.find((log) => log.id === navigationState.logId);
  }, [navigationState.logId, logs]);

  const { data: fetchedLog, isLoading: isDetailLoading } = useQuery({
    queryKey: logsQueryKeys.detail(navigationState.logId),
    queryFn: async () => {
      if (!navigationState.logId) return null;
      const found = await queryLogs(
        LogsQueryParams.parse({ id: navigationState.logId }),
      );
      return found[0] ?? null;
    },
    enabled: !!navigationState.logId && !isListLoading && !listedLog,
  });

  const selectedLog = listedLog ?? fetchedLog ?? undefined;
  // A log still being fetched by id is loading, not missing
  const isLoading = isListLoading || isDetailLoading;

  // The selected log's neighbors: the nearest log strictly after it, oldest
  // first, and the nearest strictly before it, newest first. Strictly, so a
  // log sharing its start_time with another is stepped over rather than
  // looped back to. Each is seeded into the detail cache, so stepping to it
  // renders at once and only refreshes in the background.
  const { data: neighbors } = useQuery({
    queryKey: logsQueryKeys.neighbors(
      agentId,
      scopedSkillId,
      agentWide,
      selectedLog?.id,
    ),
    queryFn: async (): Promise<{ newerLog?: Log; olderLog?: Log }> => {
      if (!selectedLog || !scope) return {};
      const [newerRows, olderRows] = await Promise.all([
        queryLogs(
          LogsQueryParams.parse({
            ...scope,
            after: String(selectedLog.start_time + 1),
            order: 'asc',
            limit: '1',
          }),
        ),
        queryLogs(
          LogsQueryParams.parse({
            ...scope,
            before: String(selectedLog.start_time - 1),
            limit: '1',
          }),
        ),
      ]);
      const newerLog: Log | undefined = newerRows[0];
      const olderLog: Log | undefined = olderRows[0];
      for (const log of [newerLog, olderLog]) {
        if (log) queryClient.setQueryData(logsQueryKeys.detail(log.id), log);
      }
      return { newerLog, olderLog };
    },
    enabled: !!selectedLog && !!scope,
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error fetching logs',
        description: 'Please try again later',
      });
    }
  }, [error, toast]);

  const refreshLogs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: logsQueryKeys.all });
  }, [queryClient]);

  // Helper functions
  const getLogById = useCallback(
    (id: string): Log | undefined => {
      return logs?.find((log: Log) => log.id === id);
    },
    [logs],
  );

  const contextValue: LogsContextType = {
    // Query state
    logs,
    selectedLog,
    newerLog: neighbors?.newerLog,
    olderLog: neighbors?.olderLog,
    isLoading,
    error,
    refetch,

    // Agent/Skill IDs
    agentId,
    setAgentId,
    skillId,
    setSkillId,
    agentWide,
    setAgentWide,

    // Pagination
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,

    // Helper functions
    getLogById,
    refreshLogs,
  };

  return (
    <LogsContext.Provider value={contextValue}>{children}</LogsContext.Provider>
  );
};

export const useLogs = (): LogsContextType => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
};
