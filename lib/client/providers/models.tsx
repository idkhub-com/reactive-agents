'use client';

import { getModels } from '@client/api/v1/idk/models';
import { getModelsBySkillId } from '@client/api/v1/idk/skills';
import type { Model, ModelQueryParams } from '@shared/types/data/model';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

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
  // All models state
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryParams, setQueryParams] = useState<ModelQueryParams | null>(null);

  // Skill-specific models state
  const [skillModels, setSkillModels] = useState<Model[]>([]);
  const [isLoadingSkillModels, setIsLoadingSkillModels] = useState(false);
  const [skillModelsError, setSkillModelsError] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);

  // Fetch all models
  const fetchModels = useCallback(async () => {
    if (!queryParams) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedModels = await getModels(queryParams);
      setModels(fetchedModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
      console.error('Error fetching models:', err);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  // Fetch skill-specific models
  const fetchSkillModels = useCallback(async () => {
    if (!skillId) {
      setSkillModels([]);
      return;
    }

    setIsLoadingSkillModels(true);
    setSkillModelsError(null);

    try {
      const fetchedSkillModels = await getModelsBySkillId(skillId);
      setSkillModels(fetchedSkillModels);
    } catch (err) {
      setSkillModelsError(
        err instanceof Error ? err.message : 'Failed to fetch skill models',
      );
      console.error('Error fetching skill models:', err);
    } finally {
      setIsLoadingSkillModels(false);
    }
  }, [skillId]);

  // Effect for fetching all models
  useEffect(() => {
    if (queryParams) {
      fetchModels();
    }
  }, [fetchModels, queryParams]);

  // Effect for fetching skill models
  useEffect(() => {
    fetchSkillModels();
  }, [fetchSkillModels]);

  const value: ModelsContextType = {
    models,
    isLoading,
    error,
    queryParams,
    setQueryParams,
    refetch: fetchModels,

    skillModels,
    isLoadingSkillModels,
    skillModelsError,
    setSkillId,
    refetchSkillModels: fetchSkillModels,
  };

  return (
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelsContext);
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
}
