'use client';
import { queryLogs } from '@client/api/v1/idk/observability/logs';
import { useToast } from '@client/hooks/use-toast';
import { useNavigation } from '@client/providers/navigation';
import { type Log, LogsQueryParams } from '@shared/types/data/log';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getLogById: (id: string) => Log | undefined;
  refreshLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

// Query keys for React Query caching
export const logsQueryKeys = {
  all: ['logs'] as const,
  lists: () => [...logsQueryKeys.all, 'list'] as const,
  list: (agentId: string | null, skillId: string | null) =>
    [...logsQueryKeys.lists(), agentId, skillId] as const,
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

  // Logs infinite query for pagination
  const {
    data: logs = [],
    isLoading,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: logsQueryKeys.list(agentId, skillId),
    queryFn: async ({ pageParam = 0 }) => {
      if (!agentId || !skillId) return [];
      return await queryLogs(
        LogsQueryParams.parse({
          agent_id: agentId,
          skill_id: skillId,
          limit: '50',
          offset: String(pageParam),
        }),
      );
    },
    select: (data) => data?.pages?.flat() ?? [],
    getNextPageParam: (lastPage, allPages) => {
      const currentLength = allPages.flat().length;
      const limit = 50;
      if (lastPage.length < limit) {
        return undefined;
      }
      return currentLength;
    },
    initialPageParam: 0,
    enabled: !!agentId && !!skillId, // Only fetch when we have both IDs
  });

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
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

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
