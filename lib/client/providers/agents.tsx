'use client';

import {
  createAgent,
  deleteAgent,
  getAgents,
  updateAgent,
} from '@client/api/v1/reactive-agents/agents';
import { useToast } from '@client/hooks/use-toast';
import { useNavigation } from '@client/providers/navigation';
import type {
  Agent,
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// Query keys for React Query caching
export const agentQueryKeys = {
  all: ['agents'] as const,
  lists: () => [...agentQueryKeys.all, 'list'] as const,
  list: (params: AgentQueryParams) =>
    [...agentQueryKeys.lists(), params] as const,
  details: () => [...agentQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentQueryKeys.details(), id] as const,
};

interface AgentsContextType {
  // Query state
  agents: Agent[];
  selectedAgent?: Agent;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: AgentQueryParams;
  setQueryParams: (params: AgentQueryParams) => void;

  // Mutation functions
  createAgent: (params: AgentCreateParams) => Promise<Agent>;
  updateAgent: (agentId: string, params: AgentUpdateParams) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;

  // Separate mutation states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;

  // Pagination
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getAgentById: (id: string) => Agent | undefined;
  refreshAgents: () => void;

  // Create Agent UI
  isCreateAgentDialogOpen: boolean;
  setIsCreateAgentDialogOpen: (isOpen: boolean) => void;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { navigationState } = useNavigation();

  const [queryParams, setQueryParams] = useState<AgentQueryParams>({});
  const [isCreateAgentDialogOpen, setIsCreateAgentDialogOpen] = useState(false);

  // Infinite query for paginated results
  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: agentQueryKeys.list(queryParams),
    queryFn: ({ pageParam = 0 }) =>
      getAgents({
        ...queryParams,
        limit: queryParams.limit || 20,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const currentLength = allPages.flat().length;
      if (lastPage.length < (queryParams.limit || 20)) {
        return undefined;
      }
      return currentLength;
    },
    initialPageParam: 0,
  });

  // Flatten pages into single array and filter out internal agents
  const agents: Agent[] = useMemo(() => {
    const allAgents = data?.pages?.flat() ?? [];
    // Filter out internal agents (e.g., 'reactive-agents')
    return allAgents.filter((agent) => agent.name !== 'reactive-agents');
  }, [data]);

  // Fetch individual agent by name when URL has a selected agent
  const { data: selectedAgentData } = useQuery({
    queryKey: ['agent', 'by-name', navigationState.selectedAgentName],
    queryFn: async () => {
      const results = await getAgents({
        name: navigationState.selectedAgentName,
        limit: 1,
      });
      return results.length > 0 ? results[0] : undefined;
    },
    enabled: !!navigationState.selectedAgentName,
    staleTime: 0, // Refetch immediately when invalidated
  });

  // Resolve selectedAgent from navigationState.selectedAgentName
  const selectedAgent = useMemo(() => {
    if (!navigationState.selectedAgentName) return undefined;
    return selectedAgentData;
  }, [navigationState.selectedAgentName, selectedAgentData]);

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: (params: AgentCreateParams) => createAgent(params),
    onSuccess: (newAgent) => {
      // Invalidate all lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: agentQueryKeys.lists() });

      toast({
        title: 'Agent created',
        description: `${newAgent.name} has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error creating agent',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: ({
      agentId,
      params,
    }: {
      agentId: string;
      params: AgentUpdateParams;
    }) => updateAgent(agentId, params),
    onSuccess: (updatedAgent) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: agentQueryKeys.lists() });

      toast({
        title: 'Agent updated',
        description: `${updatedAgent.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating agent:', error);
      toast({
        title: 'Error updating agent',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => deleteAgent(agentId),
    onSuccess: () => {
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: agentQueryKeys.lists() });

      toast({
        title: 'Agent deleted',
        description: 'Agent has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error deleting agent',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Helper functions
  const getAgentById = useCallback(
    (id: string): Agent | undefined => {
      return agents?.find((agent: Agent) => agent.id === id);
    },
    [agents],
  );

  const refreshAgents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: agentQueryKeys.all });
  }, [queryClient]);

  // Simplified mutation functions
  const createAgentHandler = useCallback(
    (params: AgentCreateParams): Promise<Agent> => {
      return new Promise((resolve, reject) => {
        createAgentMutation.mutate(params, {
          onSuccess: (agent) => resolve(agent),
          onError: (error) => reject(error),
        });
      });
    },
    [createAgentMutation],
  );

  const updateAgentHandler = useCallback(
    (agentId: string, params: AgentUpdateParams): Promise<void> => {
      return new Promise((resolve, reject) => {
        updateAgentMutation.mutate(
          { agentId, params },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          },
        );
      });
    },
    [updateAgentMutation],
  );

  const deleteAgentHandler = useCallback(
    (agentId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        deleteAgentMutation.mutate(agentId, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
    },
    [deleteAgentMutation],
  );

  const contextValue: AgentsContextType = {
    // Query state
    agents,
    selectedAgent,
    isLoading,
    error,
    refetch,

    // Query parameters
    queryParams,
    setQueryParams,

    // Simplified mutation functions
    createAgent: createAgentHandler,
    updateAgent: updateAgentHandler,
    deleteAgent: deleteAgentHandler,

    // Separate mutation states
    isCreating: createAgentMutation.isPending,
    isUpdating: updateAgentMutation.isPending,
    isDeleting: deleteAgentMutation.isPending,
    createError: createAgentMutation.error,
    updateError: updateAgentMutation.error,
    deleteError: deleteAgentMutation.error,

    // Pagination
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

    // Helper functions
    getAgentById,
    refreshAgents,

    // Create Agent UI
    isCreateAgentDialogOpen,
    setIsCreateAgentDialogOpen,
  };

  return (
    <AgentsContext.Provider value={contextValue}>
      {children}
    </AgentsContext.Provider>
  );
};

export const useAgents = (): AgentsContextType => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return context;
};
