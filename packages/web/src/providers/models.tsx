'use client';

import { getModels } from '@client/api/v1/reactive-agents/models';
import { getSkillModels } from '@client/api/v1/reactive-agents/skills';
import type { Model, ModelQueryParams } from '@shared/types/data/model';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

// Query keys for models
export const modelQueryKeys = {
  all: ['models'] as const,
  lists: () => [...modelQueryKeys.all, 'list'] as const,
  list: (params: ModelQueryParams) =>
    [...modelQueryKeys.lists(), params] as const,
  skillModels: (skillId: string) => ['models', 'skill', skillId] as const,
};

interface ModelsContextType {
  models: Model[];
  isLoading: boolean;
  error: string | null;
  queryParams: ModelQueryParams | null;
  setQueryParams: (params: ModelQueryParams | null) => void;
  refetch: () => Promise<void>;

  // Skill-specific models
  skillModels: Model[];
  isLoadingSkillModels: boolean;
  skillModelsError: string | null;
  setSkillId: (skillId: string | null) => void;
  refetchSkillModels: () => Promise<void>;
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

interface ModelsProviderProps {
  children: ReactNode;
}

export function ModelsProvider({ children }: ModelsProviderProps) {
  const [queryParams, setQueryParams] = useState<ModelQueryParams | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);

  // Fetch all models using React Query
  const {
    data: models = [],
    isLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: queryParams ? modelQueryKeys.list(queryParams) : ['models-null'],
    queryFn: () => {
      if (!queryParams) return [];
      return getModels(queryParams);
    },
    enabled: !!queryParams,
  });

  // Fetch skill-specific models using React Query
  const {
    data: skillModels = [],
    isLoading: isLoadingSkillModels,
    error: skillModelsQueryError,
    refetch: refetchSkillModelsQuery,
  } = useQuery({
    queryKey: skillId
      ? modelQueryKeys.skillModels(skillId)
      : ['skill-models-null'],
    queryFn: () => {
      if (!skillId) return [];
      return getSkillModels(skillId);
    },
    enabled: !!skillId,
  });

  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const refetchSkillModels = useCallback(async () => {
    await refetchSkillModelsQuery();
  }, [refetchSkillModelsQuery]);

  const contextValue: ModelsContextType = {
    models,
    isLoading,
    error: queryError ? (queryError as Error).message : null,
    queryParams,
    setQueryParams,
    refetch,

    skillModels,
    isLoadingSkillModels,
    skillModelsError: skillModelsQueryError
      ? (skillModelsQueryError as Error).message
      : null,
    setSkillId,
    refetchSkillModels,
  };

  return (
    <ModelsContext.Provider value={contextValue}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels(): ModelsContextType {
  const context = useContext(ModelsContext);
  if (!context) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
}
