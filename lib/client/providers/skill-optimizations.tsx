'use client';

import {
  deleteSkillOptimization,
  getSkillOptimizations,
} from '@client/api/v1/idk/skill-optimizations';
import { useToast } from '@client/hooks/use-toast';
import type {
  SkillOptimization,
  SkillOptimizationQueryParams,
} from '@shared/types/data/skill-optimization';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const skillOptimizationQueryKeys = {
  all: ['skill-optimizations'] as const,
  lists: () => [...skillOptimizationQueryKeys.all, 'list'] as const,
  list: (params: SkillOptimizationQueryParams) =>
    [...skillOptimizationQueryKeys.lists(), params] as const,
  details: () => [...skillOptimizationQueryKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...skillOptimizationQueryKeys.details(), id] as const,
};

interface SkillOptimizationsContextType {
  // Query state
  skillOptimizations: SkillOptimization[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: SkillOptimizationQueryParams;
  setQueryParams: (params: SkillOptimizationQueryParams) => void;

  // Selected skill optimization state
  selectedSkillOptimization: SkillOptimization | null;
  setSelectedSkillOptimization: (
    skillOptimization: SkillOptimization | null,
  ) => void;

  // Skill optimization mutation functions
  deleteSkillOptimization: (id: string) => Promise<void>;
}

const SkillOptimizationsContext = createContext<
  SkillOptimizationsContextType | undefined
>(undefined);

interface SkillOptimizationsProviderProps {
  children: React.ReactNode;
  initialQueryParams?: SkillOptimizationQueryParams;
}

export function SkillOptimizationsProvider({
  children,
  initialQueryParams = {},
}: SkillOptimizationsProviderProps): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query parameters state
  const [queryParams, setQueryParams] =
    useState<SkillOptimizationQueryParams>(initialQueryParams);

  // Selected skill optimization state
  const [selectedSkillOptimization, setSelectedSkillOptimization] =
    useState<SkillOptimization | null>(null);

  // Infinite query for skill optimizations
  const {
    data,
    error,
    isLoading,
    refetch: refetchQuery,
  } = useInfiniteQuery({
    queryKey: skillOptimizationQueryKeys.list(queryParams),
    queryFn: async ({ pageParam = 0 }) => {
      const params = {
        ...queryParams,
        offset: pageParam,
        limit: queryParams.limit || 25,
      };
      return await getSkillOptimizations(params);
    },
    getNextPageParam: (lastPage, pages) => {
      const limit = queryParams.limit || 25;
      return lastPage.length === limit ? pages.length * limit : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten paginated data
  const skillOptimizations = data?.pages.flat() || [];

  // Delete skill optimization mutation
  const deleteSkillOptimizationMutation = useMutation({
    mutationFn: deleteSkillOptimization,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillOptimizationQueryKeys.lists(),
      });
      setSelectedSkillOptimization(null);
      toast({
        title: 'Optimization deleted',
        description: 'Optimization has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting optimization',
        description: error.message || 'Failed to delete skill optimization',
        variant: 'destructive',
      });
    },
  });

  const deleteSkillOptimizationWrapper = useCallback(
    async (id: string): Promise<void> => {
      return await deleteSkillOptimizationMutation.mutateAsync(id);
    },
    [deleteSkillOptimizationMutation],
  );

  const refetch = useCallback(() => {
    refetchQuery();
  }, [refetchQuery]);

  const contextValue: SkillOptimizationsContextType = {
    skillOptimizations: skillOptimizations,
    isLoading,
    error,
    refetch,
    queryParams,
    setQueryParams,
    selectedSkillOptimization: selectedSkillOptimization,
    setSelectedSkillOptimization: setSelectedSkillOptimization,
    deleteSkillOptimization: deleteSkillOptimizationWrapper,
  };

  return (
    <SkillOptimizationsContext.Provider value={contextValue}>
      {children}
    </SkillOptimizationsContext.Provider>
  );
}

export function useSkillOptimizations(): SkillOptimizationsContextType {
  const context = useContext(SkillOptimizationsContext);
  if (context === undefined) {
    throw new Error(
      'useSkillOptimizations must be used within a SkillOptimizationsProvider',
    );
  }
  return context;
}
