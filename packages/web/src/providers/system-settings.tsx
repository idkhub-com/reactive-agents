'use client';

import {
  getSystemSettings,
  updateSystemSettings,
} from '@client/api/v1/reactive-agents/system-settings';
import type {
  SystemSettings,
  SystemSettingsUpdateParams,
} from '@shared/types/data/system-settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext } from 'react';

export const systemSettingsQueryKeys = {
  all: ['system-settings'] as const,
  detail: () => [...systemSettingsQueryKeys.all, 'detail'] as const,
};

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (params: SystemSettingsUpdateParams) => Promise<SystemSettings>;
  isUpdating: boolean;
}

const SystemSettingsContext = createContext<
  SystemSettingsContextType | undefined
>(undefined);

interface SystemSettingsProviderProps {
  children: ReactNode;
}

export function SystemSettingsProvider({
  children,
}: SystemSettingsProviderProps) {
  const queryClient = useQueryClient();

  const {
    data: settings = null,
    isLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: systemSettingsQueryKeys.detail(),
    queryFn: getSystemSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(
        systemSettingsQueryKeys.detail(),
        updatedSettings,
      );
    },
  });

  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const update = useCallback(
    async (params: SystemSettingsUpdateParams) => {
      return await updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const contextValue: SystemSettingsContextType = {
    settings,
    isLoading,
    error: queryError ? (queryError as Error).message : null,
    refetch,
    update,
    isUpdating: updateMutation.isPending,
  };

  return (
    <SystemSettingsContext.Provider value={contextValue}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings(): SystemSettingsContextType {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error(
      'useSystemSettings must be used within a SystemSettingsProvider',
    );
  }
  return context;
}
