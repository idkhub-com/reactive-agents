'use client';

import { getSkillArms } from '@client/api/v1/idk/skills';
import type { SkillOptimizationArm } from '@shared/types/data/skill-optimization-arm';
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
export const armQueryKeys = {
  all: ['skillOptimizationArms'] as const,
  lists: () => [...armQueryKeys.all, 'list'] as const,
  list: (skillId: string | null, clusterId: string | null) =>
    [...armQueryKeys.lists(), skillId, clusterId] as const,
};

interface ArmsContextType {
  // Query state
  arms: SkillOptimizationArm[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Skill and Cluster IDs
  skillId: string | null;
  clusterId: string | null;
  setSkillId: (skillId: string | null) => void;
  setClusterId: (clusterId: string | null) => void;

  // Helper functions
  getArmById: (id: string) => SkillOptimizationArm | undefined;
  refreshArms: () => void;
}

const ArmsContext = createContext<ArmsContextType | undefined>(undefined);

export const ArmsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const queryClient = useQueryClient();

  const [skillId, setSkillId] = useState<string | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);

  // Arms query
  const {
    data: allArms = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: armQueryKeys.list(skillId, clusterId),
    queryFn: () => getSkillArms(skillId!),
    enabled: !!skillId, // Only fetch when we have skillId
  });

  // Filter arms by clusterId if specified
  const arms = useMemo(() => {
    if (!clusterId) return allArms;
    return allArms.filter((arm) => arm.cluster_id === clusterId);
  }, [allArms, clusterId]);

  // Helper functions
  const getArmById = useCallback(
    (id: string): SkillOptimizationArm | undefined => {
      return arms?.find((arm: SkillOptimizationArm) => arm.id === id);
    },
    [arms],
  );

  const refreshArms = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: armQueryKeys.all,
    });
  }, [queryClient]);

  const contextValue: ArmsContextType = {
    // Query state
    arms,
    isLoading,
    error,
    refetch,

    // Skill and Cluster IDs
    skillId,
    clusterId,
    setSkillId,
    setClusterId,

    // Helper functions
    getArmById,
    refreshArms,
  };

  return (
    <ArmsContext.Provider value={contextValue}>{children}</ArmsContext.Provider>
  );
};

export const useArms = (): ArmsContextType => {
  const context = useContext(ArmsContext);
  if (!context) {
    throw new Error('useArms must be used within an ArmsProvider');
  }
  return context;
};
