'use client';

import { getSkillClusterStates } from '@client/api/v1/idk/skills';
import type { SkillOptimizationCluster } from '@shared/types/data/skill-optimization-cluster';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const clusterStateQueryKeys = {
  all: ['skillOptimizationClusterStates'] as const,
  lists: () => [...clusterStateQueryKeys.all, 'list'] as const,
  list: (skillId: string | null) =>
    [...clusterStateQueryKeys.lists(), skillId] as const,
};

interface ClusterStatesContextType {
  // Query state
  clusterStates: SkillOptimizationCluster[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Skill ID
  skillId: string | null;
  setSkillId: (skillId: string | null) => void;

  // Helper functions
  getClusterStateById: (id: string) => SkillOptimizationCluster | undefined;
  refreshClusterStates: () => void;
}

const ClusterStatesContext = createContext<
  ClusterStatesContextType | undefined
>(undefined);

export const ClusterStatesProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const queryClient = useQueryClient();

  const [skillId, setSkillId] = useState<string | null>(null);

  // Cluster states query
  const {
    data: clusterStates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: clusterStateQueryKeys.list(skillId),
    queryFn: () => getSkillClusterStates(skillId!),
    enabled: !!skillId, // Only fetch when we have skillId
  });

  // Helper functions
  const getClusterStateById = useCallback(
    (id: string): SkillOptimizationCluster | undefined => {
      return clusterStates?.find(
        (clusterState: SkillOptimizationCluster) => clusterState.id === id,
      );
    },
    [clusterStates],
  );

  const refreshClusterStates = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: clusterStateQueryKeys.all,
    });
  }, [queryClient]);

  const contextValue: ClusterStatesContextType = {
    // Query state
    clusterStates,
    isLoading,
    error,
    refetch,

    // Skill ID
    skillId,
    setSkillId,

    // Helper functions
    getClusterStateById,
    refreshClusterStates,
  };

  return (
    <ClusterStatesContext.Provider value={contextValue}>
      {children}
    </ClusterStatesContext.Provider>
  );
};

export const useClusterStates = (): ClusterStatesContextType => {
  const context = useContext(ClusterStatesContext);
  if (!context) {
    throw new Error(
      'useClusterStates must be used within a ClusterStatesProvider',
    );
  }
  return context;
};
