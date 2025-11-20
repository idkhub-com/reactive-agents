'use client';
import { queryLogs } from '@client/api/v1/reactive-agents/observability/logs';
import { useToast } from '@client/hooks/use-toast';
import { useNavigation } from '@client/providers/navigation';
import { type Log, LogsQueryParams } from '@shared/types/data/log';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Agent/Skill IDs
  agentId: string | null;
  setAgentId: (agentId: string | null) => void;
  skillId: string | null;
  setSkillId: (skillId: string | null) => void;

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
    page: number,
    pageSize: number,
  ) => [...logsQueryKeys.lists(), agentId, skillId, page, pageSize] as const,
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
  const [page, setPage] = useState(1); // Pages are 1-indexed for display
  const [pageSize, setPageSize] = useState(50);

  // Reset page to 1 when agent/skill changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally reset page when agentId or skillId changes
  useEffect(() => {
    setPage(1);
  }, [agentId, skillId]);

  // Logs query with pagination
  const {
    data: logs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: logsQueryKeys.list(agentId, skillId, page, pageSize),
    queryFn: async () => {
      if (!agentId || !skillId) return [];
      const offset = (page - 1) * pageSize;
      return await queryLogs(
        LogsQueryParams.parse({
          agent_id: agentId,
          skill_id: skillId,
          limit: String(pageSize),
          offset: String(offset),
        }),
      );
    },
    enabled: !!agentId && !!skillId, // Only fetch when we have both IDs
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

  // Resolve selectedLog from navigationState.logId
  const selectedLog = useMemo(() => {
    if (!navigationState.logId) return undefined;
    return logs.find((log) => log.id === navigationState.logId);
  }, [navigationState.logId, logs]);

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
    isLoading,
    error,
    refetch,

    // Agent/Skill IDs
    agentId,
    setAgentId,
    skillId,
    setSkillId,

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
