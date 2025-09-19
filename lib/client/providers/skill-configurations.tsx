'use client';

import {
  createSkillConfiguration,
  deleteSkillConfiguration,
  getSkillConfigurations,
  updateSkillConfiguration,
} from '@client/api/v1/idk/skill-configurations';
import { useToast } from '@client/hooks/use-toast';
import type {
  SkillConfiguration,
  SkillConfigurationCreateParams,
  SkillConfigurationQueryParams,
  SkillConfigurationUpdateParams,
} from '@shared/types/data/skill-configuration';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const skillConfigurationQueryKeys = {
  all: ['skill-configurations'] as const,
  lists: () => [...skillConfigurationQueryKeys.all, 'list'] as const,
  list: (params: SkillConfigurationQueryParams) =>
    [...skillConfigurationQueryKeys.lists(), params] as const,
  details: () => [...skillConfigurationQueryKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...skillConfigurationQueryKeys.details(), id] as const,
};

interface SkillConfigurationsContextType {
  // Query state
  skillConfigurations: SkillConfiguration[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: SkillConfigurationQueryParams;
  setQueryParams: (params: SkillConfigurationQueryParams) => void;

  // Selected skill configuration state
  selectedSkillConfiguration: SkillConfiguration | null;
  setSelectedSkillConfiguration: (
    skillConfiguration: SkillConfiguration | null,
  ) => void;

  // Skill configuration mutation functions
  createSkillConfiguration: (
    params: SkillConfigurationCreateParams,
  ) => Promise<SkillConfiguration>;
  updateSkillConfiguration: (
    id: string,
    params: SkillConfigurationUpdateParams,
  ) => Promise<SkillConfiguration>;
  deleteSkillConfiguration: (id: string) => Promise<void>;
}

const SkillConfigurationsContext = createContext<
  SkillConfigurationsContextType | undefined
>(undefined);

interface SkillConfigurationsProviderProps {
  children: React.ReactNode;
  initialQueryParams?: SkillConfigurationQueryParams;
}

export function SkillConfigurationsProvider({
  children,
  initialQueryParams = {},
}: SkillConfigurationsProviderProps): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query parameters state
  const [queryParams, setQueryParams] =
    useState<SkillConfigurationQueryParams>(initialQueryParams);

  // Selected skill configuration state
  const [selectedSkillConfiguration, setSelectedSkillConfiguration] =
    useState<SkillConfiguration | null>(null);

  // Infinite query for skill configurations
  const {
    data,
    error,
    isLoading,
    refetch: refetchQuery,
  } = useInfiniteQuery({
    queryKey: skillConfigurationQueryKeys.list(queryParams),
    queryFn: async ({ pageParam = 0 }) => {
      const params = {
        ...queryParams,
        offset: pageParam,
        limit: queryParams.limit || 25,
      };
      return await getSkillConfigurations(params);
    },
    getNextPageParam: (lastPage, pages) => {
      const limit = queryParams.limit || 25;
      return lastPage.length === limit ? pages.length * limit : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten paginated data
  const skillConfigurations = data?.pages.flat() || [];

  // Create skill configuration mutation
  const createSkillConfigurationMutation = useMutation({
    mutationFn: createSkillConfiguration,
    onSuccess: (newSkillConfiguration) => {
      queryClient.invalidateQueries({
        queryKey: skillConfigurationQueryKeys.lists(),
      });
      toast({
        title: 'Configuration created',
        description: `Configuration "${newSkillConfiguration.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating configuration',
        description: error.message || 'Failed to create skill configuration',
        variant: 'destructive',
      });
    },
  });

  // Update skill configuration mutation
  const updateSkillConfigurationMutation = useMutation({
    mutationFn: ({
      id,
      params,
    }: {
      id: string;
      params: SkillConfigurationUpdateParams;
    }) => updateSkillConfiguration(id, params),
    onSuccess: (updatedSkillConfiguration) => {
      queryClient.invalidateQueries({
        queryKey: skillConfigurationQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: skillConfigurationQueryKeys.detail(
          updatedSkillConfiguration.id,
        ),
      });
      toast({
        title: 'Configuration updated',
        description: `Configuration "${updatedSkillConfiguration.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating configuration',
        description: error.message || 'Failed to update skill configuration',
        variant: 'destructive',
      });
    },
  });

  // Delete skill configuration mutation
  const deleteSkillConfigurationMutation = useMutation({
    mutationFn: deleteSkillConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillConfigurationQueryKeys.lists(),
      });
      setSelectedSkillConfiguration(null);
      toast({
        title: 'Configuration deleted',
        description: 'Configuration has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting configuration',
        description: error.message || 'Failed to delete skill configuration',
        variant: 'destructive',
      });
    },
  });

  // Wrapper functions
  const createSkillConfigurationWrapper = useCallback(
    async (
      params: SkillConfigurationCreateParams,
    ): Promise<SkillConfiguration> => {
      return await createSkillConfigurationMutation.mutateAsync(params);
    },
    [createSkillConfigurationMutation],
  );

  const updateSkillConfigurationWrapper = useCallback(
    async (
      id: string,
      params: SkillConfigurationUpdateParams,
    ): Promise<SkillConfiguration> => {
      return await updateSkillConfigurationMutation.mutateAsync({ id, params });
    },
    [updateSkillConfigurationMutation],
  );

  const deleteSkillConfigurationWrapper = useCallback(
    async (id: string): Promise<void> => {
      return await deleteSkillConfigurationMutation.mutateAsync(id);
    },
    [deleteSkillConfigurationMutation],
  );

  const refetch = useCallback(() => {
    refetchQuery();
  }, [refetchQuery]);

  const contextValue: SkillConfigurationsContextType = {
    skillConfigurations,
    isLoading,
    error,
    refetch,
    queryParams,
    setQueryParams,
    selectedSkillConfiguration,
    setSelectedSkillConfiguration,
    createSkillConfiguration: createSkillConfigurationWrapper,
    updateSkillConfiguration: updateSkillConfigurationWrapper,
    deleteSkillConfiguration: deleteSkillConfigurationWrapper,
  };

  return (
    <SkillConfigurationsContext.Provider value={contextValue}>
      {children}
    </SkillConfigurationsContext.Provider>
  );
}

export function useSkillConfigurations(): SkillConfigurationsContextType {
  const context = useContext(SkillConfigurationsContext);
  if (context === undefined) {
    throw new Error(
      'useSkillConfigurations must be used within a SkillConfigurationsProvider',
    );
  }
  return context;
}
