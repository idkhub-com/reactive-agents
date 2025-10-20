'use client';

import {
  createAgent,
  deleteAgent,
  getAgents,
  updateAgent,
} from '@client/api/v1/idk/agents';
import { useToast } from '@client/hooks/use-toast';
import type {
  Agent,
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// Constants
const SELECTED_AGENT_STORAGE_KEY = 'idkhub-selected-agent-id';

// Helper functions for localStorage
const getStoredAgentId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SELECTED_AGENT_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeAgentId = (agentId: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (agentId) {
      localStorage.setItem(SELECTED_AGENT_STORAGE_KEY, agentId);
    } else {
      localStorage.removeItem(SELECTED_AGENT_STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

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
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: AgentQueryParams;
  setQueryParams: (params: AgentQueryParams) => void;

  // Selected agent state
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;

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
  const pathname = usePathname();

  const [queryParams, setQueryParams] = useState<AgentQueryParams>({});
  const [selectedAgent, setSelectedAgentState] = useState<Agent | null>(null);
  const [isCreateAgentDialogOpen, setIsCreateAgentDialogOpen] = useState(false);

  // Custom setSelectedAgent that handles localStorage
  const setSelectedAgent = useCallback((agent: Agent | null) => {
    setSelectedAgentState(agent);
    storeAgentId(agent?.id || null);
  }, []);

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

  // Flatten pages into single array
  const agents: Agent[] = data?.pages?.flat() ?? [];

  // Clear selected agent when on /agents page
  useEffect(() => {
    if (pathname === '/agents') {
      setSelectedAgentState(null);
      storeAgentId(null);
    }
  }, [pathname]);

  // Auto-select agent logic
  useEffect(() => {
    // Don't auto-select if we're on the agents list page
    if (pathname === '/agents') {
      return;
    }

    if (isLoading || agents.length === 0) {
      return;
    }

    // If we already have a selected agent and it's still in the list, keep it
    if (
      selectedAgent &&
      agents.some((agent) => agent.id === selectedAgent.id)
    ) {
      return;
    }

    // Try to restore from localStorage
    const storedAgentId = getStoredAgentId();

    if (storedAgentId) {
      const storedAgent = agents.find((agent) => agent.id === storedAgentId);
      if (storedAgent) {
        setSelectedAgentState(storedAgent);
        return;
      }
    }

    // Only auto-select first agent if we had a stored preference that's no longer valid
    // This prevents auto-selection in tests and fresh app loads
    if (!selectedAgent && agents.length > 0 && storedAgentId) {
      const firstAgent = agents[0];
      setSelectedAgent(firstAgent);
    }
  }, [agents, isLoading, selectedAgent, setSelectedAgent, pathname]);

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: (params: AgentCreateParams) => createAgent(params),
    onSuccess: (newAgent) => {
      // Invalidate all lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: agentQueryKeys.lists() });

      // Auto-select the newly created agent
      setSelectedAgent(newAgent);

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

      // Update selected agent if it's the one being updated
      if (selectedAgent?.id === updatedAgent.id) {
        setSelectedAgent(updatedAgent);
      }

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
    onMutate: (agentId) => {
      // Clear selected agent if it's the one being deleted
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
    },
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
    isLoading,
    error,
    refetch,

    // Query parameters
    queryParams,
    setQueryParams,

    // Selected agent state
    selectedAgent,
    setSelectedAgent,

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
