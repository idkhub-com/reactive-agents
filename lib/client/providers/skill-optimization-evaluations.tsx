'use client';

import {
  createSkillEvaluation,
  deleteSkillEvaluation,
  getSkillEvaluations,
  updateSkillEvaluation,
} from '@client/api/v1/reactive-agents/skills';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for evaluations
export const evaluationQueryKeys = {
  all: ['evaluations'] as const,
  skillEvaluations: (skillId: string) =>
    ['evaluations', 'skill', skillId] as const,
};

interface SkillOptimizationEvaluationsContextType {
  evaluations: SkillOptimizationEvaluation[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: Error | null;
  refetch: () => void;
  setSkillId: (skillId: string | null) => void;
  createEvaluation: (
    skillId: string,
    methods: EvaluationMethodName[],
  ) => Promise<SkillOptimizationEvaluation[]>;
  updateEvaluation: (
    skillId: string,
    evaluationId: string,
    params: {
      weight: number;
      params?: Record<string, unknown>;
      model_id?: string | null;
    },
  ) => Promise<SkillOptimizationEvaluation>;
  deleteEvaluation: (skillId: string, evaluationId: string) => Promise<void>;
}

interface SkillOptimizationEvaluationsProviderProps {
  children: ReactNode;
}

const SkillOptimizationEvaluationsContext = createContext<
  SkillOptimizationEvaluationsContextType | undefined
>(undefined);

export function SkillOptimizationEvaluationsProvider({
  children,
}: SkillOptimizationEvaluationsProviderProps): ReactElement {
  const queryClient = useQueryClient();
  const [skillId, setSkillId] = useState<string | null>(null);

  // Fetch evaluations using React Query
  const {
    data: evaluations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: skillId
      ? evaluationQueryKeys.skillEvaluations(skillId)
      : ['evaluations-null'],
    queryFn: () => {
      if (!skillId) return [];
      return getSkillEvaluations(skillId);
    },
    enabled: !!skillId,
  });

  // Create evaluation mutation
  const createMutation = useMutation({
    mutationFn: ({
      skillId,
      methods,
    }: {
      skillId: string;
      methods: EvaluationMethodName[];
    }) => createSkillEvaluation(skillId, methods),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: evaluationQueryKeys.skillEvaluations(variables.skillId),
      });
    },
  });

  // Update evaluation mutation
  const updateMutation = useMutation({
    mutationFn: ({
      skillId,
      evaluationId,
      params,
    }: {
      skillId: string;
      evaluationId: string;
      params: {
        weight: number;
        params?: Record<string, unknown>;
        model_id?: string | null;
      };
    }) => updateSkillEvaluation(skillId, evaluationId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: evaluationQueryKeys.skillEvaluations(variables.skillId),
      });
    },
  });

  // Delete evaluation mutation
  const deleteMutation = useMutation({
    mutationFn: ({
      skillId,
      evaluationId,
    }: {
      skillId: string;
      evaluationId: string;
    }) => deleteSkillEvaluation(skillId, evaluationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: evaluationQueryKeys.skillEvaluations(variables.skillId),
      });
    },
  });

  const createEvaluation = useCallback(
    async (skillId: string, methods: EvaluationMethodName[]) => {
      return await createMutation.mutateAsync({ skillId, methods });
    },
    [createMutation],
  );

  const updateEvaluation = useCallback(
    async (
      skillId: string,
      evaluationId: string,
      params: {
        weight: number;
        params?: Record<string, unknown>;
        model_id?: string | null;
      },
    ) => {
      return await updateMutation.mutateAsync({
        skillId,
        evaluationId,
        params,
      });
    },
    [updateMutation],
  );

  const deleteEvaluation = useCallback(
    async (skillId: string, evaluationId: string) => {
      await deleteMutation.mutateAsync({ skillId, evaluationId });
    },
    [deleteMutation],
  );

  const contextValue: SkillOptimizationEvaluationsContextType = {
    evaluations,
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: error as Error | null,
    refetch,
    setSkillId,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
  };

  return (
    <SkillOptimizationEvaluationsContext.Provider value={contextValue}>
      {children}
    </SkillOptimizationEvaluationsContext.Provider>
  );
}

export function useSkillOptimizationEvaluations(): SkillOptimizationEvaluationsContextType {
  const context = useContext(SkillOptimizationEvaluationsContext);
  if (!context) {
    throw new Error(
      'useSkillOptimizationEvaluations must be used within a SkillOptimizationEvaluationsProvider',
    );
  }
  return context;
}
