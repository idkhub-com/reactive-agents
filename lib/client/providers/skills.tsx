'use client';

import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
} from '@client/api/v1/idk/skills';
import { useToast } from '@client/hooks/use-toast';
import type {
  Skill,
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data/skill';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// Query keys for React Query caching
export const skillQueryKeys = {
  all: ['skills'] as const,
  lists: () => [...skillQueryKeys.all, 'list'] as const,
  list: (params: SkillQueryParams) =>
    [...skillQueryKeys.lists(), params] as const,
  details: () => [...skillQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...skillQueryKeys.details(), id] as const,
};

interface SkillsContextType {
  // Query state
  skills: Skill[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Query parameters
  queryParams: SkillQueryParams;
  setQueryParams: (params: SkillQueryParams) => void;

  // Selected skill state
  selectedSkill: Skill | null;
  setSelectedSkill: (skill: Skill | null) => void;

  // Skill mutation functions
  createSkill: (params: SkillCreateParams) => Promise<Skill>;
  updateSkill: (skillId: string, params: SkillUpdateParams) => Promise<void>;
  deleteSkill: (skillId: string) => Promise<void>;

  // Skill mutation states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;

  // Pagination
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  // Helper functions
  getSkillById: (id: string) => Skill | undefined;
  refreshSkills: () => void;
}

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

export const SkillsProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [queryParams, setQueryParams] = useState<SkillQueryParams>({});
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Skills infinite query for pagination
  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: skillQueryKeys.list(queryParams),
    queryFn: ({ pageParam = 0 }) =>
      getSkills({
        ...queryParams,
        limit: queryParams.limit || 20,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const currentLength = allPages.flat().length;
      if (lastPage.length < (queryParams.limit || 20)) {
        return undefined;
      }
      return currentLength;
    },
    initialPageParam: 0,
  });

  // Flatten pages into single array
  const skills: Skill[] = data?.pages?.flat() ?? [];

  // Create skill mutation
  const createSkillMutation = useMutation({
    mutationFn: (params: SkillCreateParams) => createSkill(params),
    onSuccess: (newSkill) => {
      // Invalidate all lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() });

      toast({
        title: 'Skill created',
        description: `${newSkill.name} has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error creating skill:', error);
      toast({
        title: 'Error creating skill',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Update skill mutation
  const updateSkillMutation = useMutation({
    mutationFn: ({
      skillId,
      params,
    }: {
      skillId: string;
      params: SkillUpdateParams;
    }) => updateSkill(skillId, params),
    onSuccess: (updatedSkill: Skill) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() });

      // Update selected skill if it's the one being updated
      if (selectedSkill?.id === updatedSkill.id) {
        setSelectedSkill(updatedSkill);
      }

      toast({
        title: 'Skill updated',
        description: `${updatedSkill.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating skill:', error);
      toast({
        title: 'Error updating skill',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Delete skill mutation
  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: string) => deleteSkill(skillId),
    onMutate: (skillId) => {
      // Clear selected skill if it's the one being deleted
      if (selectedSkill?.id === skillId) {
        setSelectedSkill(null);
      }
    },
    onSuccess: () => {
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() });

      toast({
        title: 'Skill deleted',
        description: 'Skill has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting skill:', error);
      toast({
        title: 'Error deleting skill',
        description: 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Helper functions
  const getSkillById = useCallback(
    (id: string): Skill | undefined => {
      return skills?.find((skill) => skill.id === id);
    },
    [skills],
  );

  const refreshSkills = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: skillQueryKeys.all });
  }, [queryClient]);

  // Simplified mutation functions
  const createSkillHandler = useCallback(
    (params: SkillCreateParams): Promise<Skill> => {
      return createSkillMutation.mutateAsync(params);
    },
    [createSkillMutation],
  );

  const updateSkillHandler = useCallback(
    async (skillId: string, params: SkillUpdateParams): Promise<void> => {
      await updateSkillMutation.mutateAsync({ skillId, params });
    },
    [updateSkillMutation],
  );

  const deleteSkillHandler = useCallback(
    async (skillId: string): Promise<void> => {
      await deleteSkillMutation.mutateAsync(skillId);
    },
    [deleteSkillMutation],
  );

  const contextValue: SkillsContextType = {
    // Query state
    skills,
    isLoading,
    error,
    refetch,

    // Query parameters
    queryParams,
    setQueryParams,

    // Selected skill state
    selectedSkill,
    setSelectedSkill,

    // Skill mutation functions
    createSkill: createSkillHandler,
    updateSkill: updateSkillHandler,
    deleteSkill: deleteSkillHandler,

    // Skill mutation states
    isCreating: createSkillMutation.isPending,
    isUpdating: updateSkillMutation.isPending,
    isDeleting: deleteSkillMutation.isPending,
    createError: createSkillMutation.error,
    updateError: updateSkillMutation.error,
    deleteError: deleteSkillMutation.error,

    // Pagination
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,

    // Helper functions
    getSkillById,
    refreshSkills,
  };

  return (
    <SkillsContext.Provider value={contextValue}>
      {children}
    </SkillsContext.Provider>
  );
};

export const useSkills = (): SkillsContextType => {
  const context = useContext(SkillsContext);
  if (!context) {
    throw new Error('useSkills must be used within a SkillsProvider');
  }
  return context;
};
