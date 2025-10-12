'use client';

import { queryLogs } from '@client/api/v1/idk/observability/logs';
import { useToast } from '@client/hooks/use-toast';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { type Log, LogsQueryParams } from '@shared/types/data/log';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

interface LogsContextType {
  logs: Log[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  queryParams: Partial<LogsQueryParams>;
  setQueryParams: (params: Partial<LogsQueryParams>) => void;
  refreshLogs: () => void;
  selectedLog: Log | null;
  setSelectedLog: (log: Log | null) => void;
  logsViewOpen: boolean;
  setLogsViewOpen: (open: boolean) => void;
  modifiedValue: string;
  setModifiedValue: (value: string) => void;
  saveModifiedValue: () => void;
  // Pagination
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getLogById: (id: string) => Log | undefined;
  // New methods for querying with custom params
  queryLogs: (params: LogsQueryParams) => Promise<Log[]>;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

// Query keys for React Query caching
export const logsQueryKeys = {
  all: ['logs'] as const,
  lists: () => [...logsQueryKeys.all, 'list'] as const,
  list: (params: Partial<LogsQueryParams>) =>
    [...logsQueryKeys.lists(), params] as const,
  details: () => [...logsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...logsQueryKeys.details(), id] as const,
};

export const LogsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const { toast } = useToast();
  const { selectedAgent } = useAgents();
  const { navigationState } = useNavigation();
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [logsViewOpen, setLogsViewOpen] = useState(false);
  const [modifiedValue, setModifiedValue] = useState<string>('');
  const [queryParams, setQueryParams] = useState<Partial<LogsQueryParams>>({});

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
    queryKey: logsQueryKeys.list({
      ...queryParams,
      agent_id: queryParams.agent_id ?? navigationState.selectedAgent?.id,
      skill_id: queryParams.skill_id ?? navigationState.selectedSkill?.id,
    }),
    queryFn: async ({ pageParam = 0 }) => {
      const agentId = queryParams.agent_id ?? navigationState.selectedAgent?.id;
      if (!agentId) return [] as Log[];
      const parsed = LogsQueryParams.parse({
        ...queryParams,
        agent_id: agentId,
        limit:
          queryParams.limit !== undefined
            ? String(queryParams.limit)
            : String(20),
        offset: String(pageParam),
      });
      return await queryLogs(parsed);
    },
    select: (data) => data?.pages?.flat() ?? [],
    getNextPageParam: (lastPage, allPages) => {
      const currentLength = allPages.flat().length;
      const limit = (queryParams.limit as number | undefined) ?? 20;
      if (lastPage.length < limit) {
        return undefined;
      }
      return currentLength;
    },
    initialPageParam: 0,
    enabled: !!(queryParams.agent_id ?? navigationState.selectedAgent?.id),
    staleTime: 0,
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

  // Clear selected log when agent changes
  const currentAgentId = selectedAgent?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to clear selected log when agent changes
  useEffect(() => {
    setSelectedLog(null);
  }, [currentAgentId]);

  const saveModifiedValue = useCallback(() => {
    if (selectedLog) {
      if (!('choices' in selectedLog.ai_provider_request_log.response_body)) {
        return;
      }

      const selectedLogResponseBody = selectedLog.ai_provider_request_log
        .response_body as ChatCompletionResponseBody;

      const updatedChoice = {
        ...selectedLogResponseBody.choices[0],
        message: {
          ...selectedLogResponseBody.choices[0].message,
          content: modifiedValue,
        },
      };

      const updatedChoices = [updatedChoice];

      const updatedResponseBody = {
        ...selectedLog.ai_provider_request_log.response_body,
        choices: updatedChoices,
      };

      // Save the modified value to the log to local storage
      const data = {
        id: selectedLog.id,
        response_body: updatedResponseBody,
      };

      localStorage.setItem(selectedLog.id, JSON.stringify(data));
    }
  }, [selectedLog, modifiedValue]);

  // Method to query logs with custom parameters
  const queryLogsWithParams = useCallback(
    async (params: LogsQueryParams): Promise<Log[]> => {
      return await queryLogs(params);
    },
    [],
  );

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

  const contextValue = {
    logs,
    isLoading,
    error,
    refetch,
    queryParams,
    setQueryParams,
    refreshLogs,
    selectedLog,
    setSelectedLog,
    logsViewOpen,
    setLogsViewOpen,
    modifiedValue,
    setModifiedValue,
    saveModifiedValue,
    // Pagination
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

    // Helper functions
    getLogById,
    queryLogs: queryLogsWithParams,
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
