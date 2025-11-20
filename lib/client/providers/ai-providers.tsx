'use client';

import {
  createAIProvider,
  deleteAIProvider,
  getAIProviderAPIKeys,
  updateAIProvider,
} from '@client/api/v1/reactive-agents/ai-providers';
import { useToast } from '@client/hooks/use-toast';
import type {
  AIProviderConfig,
  AIProviderConfigCreateParams,
  AIProviderConfigQueryParams,
  AIProviderConfigUpdateParams,
} from '@shared/types/data/ai-provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const aiProvidersQueryKeys = {
  all: ['ai-providers'] as const,
  lists: () => [...aiProvidersQueryKeys.all, 'list'] as const,
  list: (params: AIProviderConfigQueryParams) =>
    [...aiProvidersQueryKeys.lists(), params] as const,
  details: () => [...aiProvidersQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiProvidersQueryKeys.details(), id] as const,
};

interface AIProvidersContextType {
  // Query state
  aiProviderConfigs: AIProviderConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: AIProviderConfigQueryParams;
  setQueryParams: (params: AIProviderConfigQueryParams) => void;

  // Mutation functions
  createAPIKey: (
    params: AIProviderConfigCreateParams,
  ) => Promise<AIProviderConfig>;
  updateAPIKey: (
    id: string,
    params: AIProviderConfigUpdateParams,
  ) => Promise<void>;
  deleteAPIKey: (id: string) => Promise<void>;

  // Separate mutation states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;

  // Helper functions
  getAPIKeyById: (id: string) => AIProviderConfig | undefined;
  getAPIKeysByProvider: (provider: string) => AIProviderConfig[];
  refreshAPIKeys: () => void;
}

const AIProvidersContext = createContext<AIProvidersContextType | null>(null);

interface AIProvidersProviderProps {
  children: React.ReactNode;
}

export function AIProvidersProvider({ children }: AIProvidersProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query parameters state
  const [queryParams, setQueryParams] = useState<AIProviderConfigQueryParams>({
    limit: 50,
  });

  // Fetch API keys query
  const {
    data: apiKeys = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: aiProvidersQueryKeys.list(queryParams),
    queryFn: () => getAIProviderAPIKeys(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: createAIProvider,
    onSuccess: async (newAPIKey) => {
      // Wait for queries to be invalidated before proceeding
      await queryClient.invalidateQueries({
        queryKey: aiProvidersQueryKeys.lists(),
      });
      toast({
        title: 'API Key Created',
        description: `API key "${newAPIKey.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create API Key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update API key mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      params,
    }: {
      id: string;
      params: AIProviderConfigUpdateParams;
    }) => updateAIProvider(id, params),
    onSuccess: async () => {
      // Wait for queries to be invalidated before proceeding
      await queryClient.invalidateQueries({
        queryKey: aiProvidersQueryKeys.lists(),
      });
      toast({
        title: 'API Key Updated',
        description: 'API key has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update API Key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAIProvider,
    onSuccess: async () => {
      // Wait for queries to be invalidated before proceeding
      await queryClient.invalidateQueries({
        queryKey: aiProvidersQueryKeys.lists(),
      });
      toast({
        title: 'API Key Deleted',
        description: 'API key has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete API Key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper functions
  const getAPIKeyById = useCallback(
    (id: string): AIProviderConfig | undefined => {
      return apiKeys.find((apiKey) => apiKey.id === id);
    },
    [apiKeys],
  );

  const getAPIKeysByProvider = useCallback(
    (provider: string): AIProviderConfig[] => {
      return apiKeys.filter((apiKey) => apiKey.ai_provider === provider);
    },
    [apiKeys],
  );

  const refreshAPIKeys = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: aiProvidersQueryKeys.lists(),
    });
  }, [queryClient]);

  // Mutation wrapper functions
  const createAPIKey = useCallback(
    async (params: AIProviderConfigCreateParams): Promise<AIProviderConfig> => {
      return await createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  const updateAPIKey = useCallback(
    async (id: string, params: AIProviderConfigUpdateParams): Promise<void> => {
      await updateMutation.mutateAsync({ id, params });
    },
    [updateMutation],
  );

  const deleteAPIKey = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const contextValue: AIProvidersContextType = {
    // Query state
    aiProviderConfigs: apiKeys,
    isLoading,
    error,
    refetch,

    // Query parameters
    queryParams,
    setQueryParams,

    // Mutation functions
    createAPIKey,
    updateAPIKey,
    deleteAPIKey,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,

    // Helper functions
    getAPIKeyById,
    getAPIKeysByProvider,
    refreshAPIKeys,
  };

  return (
    <AIProvidersContext.Provider value={contextValue}>
      {children}
    </AIProvidersContext.Provider>
  );
}

export function useAIProviders(): AIProvidersContextType {
  const context = useContext(AIProvidersContext);
  if (!context) {
    throw new Error(
      'useAIProviderAPIKeys must be used within an AIProviderAPIKeysProvider',
    );
  }
  return context;
}
