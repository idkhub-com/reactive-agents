'use client';

import {
  createSkillEvaluation,
  deleteSkillEvaluation,
  getSkillEvaluations,
} from '@client/api/v1/idk/skills';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import type { ReactElement, ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

interface SkillOptimizationEvaluationsContextType {
  evaluations: SkillOptimizationEvaluation[];
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  fetchEvaluations: (skillId: string) => Promise<void>;
  createEvaluation: (
    skillId: string,
    methods: EvaluationMethodName[],
  ) => Promise<SkillOptimizationEvaluation[]>;
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
  const [evaluations, setEvaluations] = useState<SkillOptimizationEvaluation[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEvaluations = useCallback(async (skillId: string) => {
    setIsLoading(true);
    try {
      const data = await getSkillEvaluations(skillId);
      console.log(
        'SkillOptimizationEvaluationsProvider - Fetched evaluations:',
        {
          skillId,
          count: data.length,
          evaluations: data.map((e) => ({
            id: e.id,
            method: e.evaluation_method,
          })),
        },
      );
      setEvaluations(data);
    } catch (error) {
      console.error('Failed to fetch skill evaluations:', error);
      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvaluation = useCallback(
    async (skillId: string, methods: EvaluationMethodName[]) => {
      setIsCreating(true);
      try {
        const newEvaluations = await createSkillEvaluation(skillId, methods);
        setEvaluations((prev) => [...prev, ...newEvaluations]);
        return newEvaluations;
      } catch (error) {
        console.error('Failed to create skill evaluation:', error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const deleteEvaluation = useCallback(
    async (skillId: string, evaluationId: string) => {
      setIsDeleting(true);
      try {
        await deleteSkillEvaluation(skillId, evaluationId);
        setEvaluations((prev) =>
          prev.filter((evaluation) => evaluation.id !== evaluationId),
        );
      } catch (error) {
        console.error('Failed to delete skill evaluation:', error);
        throw error;
      } finally {
        setIsDeleting(false);
      }
    },
    [],
  );

  return (
    <SkillOptimizationEvaluationsContext.Provider
      value={{
        evaluations,
        isLoading,
        isCreating,
        isDeleting,
        fetchEvaluations,
        createEvaluation,
        deleteEvaluation,
      }}
    >
      {children}
    </SkillOptimizationEvaluationsContext.Provider>
  );
}

export function useSkillOptimizationEvaluations(): SkillOptimizationEvaluationsContextType {
  const context = useContext(SkillOptimizationEvaluationsContext);
  if (!context) {
    throw new Error(
      'useSkillOptimizationEvaluations must be used within SkillOptimizationEvaluationsProvider',
    );
  }
  return context;
}
