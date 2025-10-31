'use client';

import { getSkillClusterStates as getSkillClusters } from '@client/api/v1/reactive-agents/skills';
import { useNavigation } from '@client/providers/navigation';
import type { SkillOptimizationCluster } from '@shared/types/data/skill-optimization-cluster';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// Query keys for React Query caching
export const clusterQueryKeys = {
  all: ['skillOptimizationClusters'] as const,
  lists: () => [...clusterQueryKeys.all, 'list'] as const,
  list: (skillId: string | null) =>
    [...clusterQueryKeys.lists(), skillId] as const,
};

interface ClustersContextType {
  // Query state
  clusters: SkillOptimizationCluster[];
  selectedCluster?: SkillOptimizationCluster;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Skill ID
  skillId: string | null;
  setSkillId: (skillId: string | null) => void;

  // Helper functions
  getClusterById: (id: string) => SkillOptimizationCluster | undefined;
  refreshClusters: () => void;
}

const ClustersContext = createContext<ClustersContextType | undefined>(
  undefined,
);

export const SkillOptimizationClustersProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const queryClient = useQueryClient();
  const { navigationState } = useNavigation();

  const [skillId, setSkillId] = useState<string | null>(null);

  // Cluster states query
  const {
    data: clusters = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: clusterQueryKeys.list(skillId),
    queryFn: () => getSkillClusters(skillId!),
    enabled: !!skillId, // Only fetch when we have skillId
  });

  // Resolve selectedCluster from navigationState.selectedClusterName
  const selectedCluster = useMemo(() => {
    if (!navigationState.selectedClusterName) return undefined;
    return clusters.find(
      (cluster) => cluster.name === navigationState.selectedClusterName,
    );
  }, [navigationState.selectedClusterName, clusters]);

  // Helper functions
  const getClusterById = useCallback(
    (id: string): SkillOptimizationCluster | undefined => {
      return clusters?.find(
        (cluster: SkillOptimizationCluster) => cluster.id === id,
      );
    },
    [clusters],
  );

  const refreshClusters = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: clusterQueryKeys.all,
    });
  }, [queryClient]);

  const contextValue: ClustersContextType = {
    // Query state
    clusters,
    selectedCluster,
    isLoading,
    error,
    refetch,

    // Skill ID
    skillId,
    setSkillId,

    // Helper functions
    getClusterById: getClusterById,
    refreshClusters: refreshClusters,
  };

  return (
    <ClustersContext.Provider value={contextValue}>
      {children}
    </ClustersContext.Provider>
  );
};

export const useSkillOptimizationClusters = (): ClustersContextType => {
  const context = useContext(ClustersContext);
  if (!context) {
    throw new Error('useClusters must be used within a ClustersProvider');
  }
  return context;
};
