'use client';

import {
  createAIProviderAPIKey,
  deleteAIProviderAPIKey,
  getAIProviderAPIKeys,
  updateAIProviderAPIKey,
} from '@client/api/v1/idk/ai-provider-api-keys';
import { useToast } from '@client/hooks/use-toast';
import type {
  AIProviderAPIKey,
  AIProviderAPIKeyCreateParams,
  AIProviderAPIKeyQueryParams,
  AIProviderAPIKeyUpdateParams,
} from '@shared/types/data/ai-provider-api-key';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const aiProviderAPIKeyQueryKeys = {
  all: ['ai-provider-api-keys'] as const,
  lists: () => [...aiProviderAPIKeyQueryKeys.all, 'list'] as const,
  list: (params: AIProviderAPIKeyQueryParams) =>
    [...aiProviderAPIKeyQueryKeys.lists(), params] as const,
  details: () => [...aiProviderAPIKeyQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiProviderAPIKeyQueryKeys.details(), id] as const,
};

interface AIProviderAPIKeysContextType {
  // Query state
  apiKeys: AIProviderAPIKey[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: AIProviderAPIKeyQueryParams;
  setQueryParams: (params: AIProviderAPIKeyQueryParams) => void;

  // Mutation functions
  createAPIKey: (
    params: AIProviderAPIKeyCreateParams,
  ) => Promise<AIProviderAPIKey>;
  updateAPIKey: (
    id: string,
    params: AIProviderAPIKeyUpdateParams,
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
  getAPIKeyById: (id: string) => AIProviderAPIKey | undefined;
  getAPIKeysByProvider: (provider: string) => AIProviderAPIKey[];
  refreshAPIKeys: () => void;
}

const AIProviderAPIKeysContext =
  createContext<AIProviderAPIKeysContextType | null>(null);

interface AIProviderAPIKeysProviderProps {
  children: React.ReactNode;
}

export function AIProviderAPIKeysProvider({
  children,
}: AIProviderAPIKeysProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query parameters state
  const [queryParams, setQueryParams] = useState<AIProviderAPIKeyQueryParams>({
    limit: 50,
  });

  // Fetch API keys query
  const {
    data: apiKeys = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: aiProviderAPIKeyQueryKeys.list(queryParams),
    queryFn: () => getAIProviderAPIKeys(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: createAIProviderAPIKey,
    onSuccess: (newAPIKey) => {
      queryClient.invalidateQueries({
        queryKey: aiProviderAPIKeyQueryKeys.lists(),
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
      params: AIProviderAPIKeyUpdateParams;
    }) => updateAIProviderAPIKey(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiProviderAPIKeyQueryKeys.lists(),
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
    mutationFn: deleteAIProviderAPIKey,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiProviderAPIKeyQueryKeys.lists(),
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
    (id: string): AIProviderAPIKey | undefined => {
      return apiKeys.find((apiKey) => apiKey.id === id);
    },
    [apiKeys],
  );

  const getAPIKeysByProvider = useCallback(
    (provider: string): AIProviderAPIKey[] => {
      return apiKeys.filter((apiKey) => apiKey.ai_provider === provider);
    },
    [apiKeys],
  );

  const refreshAPIKeys = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: aiProviderAPIKeyQueryKeys.lists(),
    });
  }, [queryClient]);

  // Mutation wrapper functions
  const createAPIKey = useCallback(
    async (params: AIProviderAPIKeyCreateParams): Promise<AIProviderAPIKey> => {
      return await createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  const updateAPIKey = useCallback(
    async (id: string, params: AIProviderAPIKeyUpdateParams): Promise<void> => {
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

  const contextValue: AIProviderAPIKeysContextType = {
    // Query state
    apiKeys,
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
    <AIProviderAPIKeysContext.Provider value={contextValue}>
      {children}
    </AIProviderAPIKeysContext.Provider>
  );
}

export function useAIProviderAPIKeys(): AIProviderAPIKeysContextType {
  const context = useContext(AIProviderAPIKeysContext);
  if (!context) {
    throw new Error(
      'useAIProviderAPIKeys must be used within an AIProviderAPIKeysProvider',
    );
  }
  return context;
}
