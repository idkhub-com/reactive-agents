'use client';

import { getSkillEvaluationRuns } from '@client/api/v1/reactive-agents/skills';
import type { SkillOptimizationEvaluationRun } from '@shared/types/data/skill-optimization-evaluation-run';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const skillOptimizationEvaluationRunQueryKeys = {
  all: ['skillOptimizationEvaluationRuns'] as const,
  lists: () =>
    [...skillOptimizationEvaluationRunQueryKeys.all, 'list'] as const,
  list: (skillId: string | null) =>
    [...skillOptimizationEvaluationRunQueryKeys.lists(), skillId] as const,
};

interface SkillOptimizationEvaluationRunsContextType {
  // Query state
  evaluationRuns: SkillOptimizationEvaluationRun[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Skill ID
  skillId: string | null;
  setSkillId: (skillId: string | null) => void;

  // Helper functions
  getEvaluationRunsByClusterId: (
    clusterId: string,
  ) => SkillOptimizationEvaluationRun[];
  refreshEvaluationRuns: () => void;
}

const SkillOptimizationEvaluationRunsContext = createContext<
  SkillOptimizationEvaluationRunsContextType | undefined
>(undefined);

export const SkillOptimizationEvaluationRunsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const queryClient = useQueryClient();

  const [skillId, setSkillId] = useState<string | null>(null);

  // Evaluation runs query
  const {
    data: evaluationRuns = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: skillOptimizationEvaluationRunQueryKeys.list(skillId),
    queryFn: () => getSkillEvaluationRuns(skillId!),
    enabled: !!skillId,
  });

  // Helper functions
  const getEvaluationRunsByClusterId = useCallback(
    (clusterId: string): SkillOptimizationEvaluationRun[] => {
      return evaluationRuns.filter(
        (run: SkillOptimizationEvaluationRun) => run.cluster_id === clusterId,
      );
    },
    [evaluationRuns],
  );

  const refreshEvaluationRuns = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: skillOptimizationEvaluationRunQueryKeys.all,
    });
  }, [queryClient]);

  const contextValue: SkillOptimizationEvaluationRunsContextType = {
    // Query state
    evaluationRuns,
    isLoading,
    error,
    refetch,

    // Skill ID
    skillId,
    setSkillId,

    // Helper functions
    getEvaluationRunsByClusterId,
    refreshEvaluationRuns,
  };

  return (
    <SkillOptimizationEvaluationRunsContext.Provider value={contextValue}>
      {children}
    </SkillOptimizationEvaluationRunsContext.Provider>
  );
};

export const useSkillOptimizationEvaluationRuns =
  (): SkillOptimizationEvaluationRunsContextType => {
    const context = useContext(SkillOptimizationEvaluationRunsContext);
    if (!context) {
      throw new Error(
        'useSkillOptimizationEvaluationRuns must be used within a SkillOptimizationEvaluationRunsProvider',
      );
    }
    return context;
  };
