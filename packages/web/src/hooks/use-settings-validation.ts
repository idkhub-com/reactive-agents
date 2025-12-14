'use client';

import { useModels } from '@client/providers/models';
import { useSystemSettings } from '@client/providers/system-settings';
import { useEffect, useMemo } from 'react';

interface SettingsValidationResult {
  /** Whether all required settings are configured */
  isComplete: boolean;
  /** Whether the validation is still loading */
  isLoading: boolean;
  /** List of missing required settings */
  missingSettings: string[];
  /** Whether there are any models configured */
  hasModels: boolean;
  /** Whether there are text models available */
  hasTextModels: boolean;
  /** Whether there are embed models available */
  hasEmbedModels: boolean;
  /** Whether both text and embed models are available */
  hasRequiredModelTypes: boolean;
}

/**
 * Hook to validate system settings configuration.
 * Checks if all required models are configured in settings.
 */
export function useSettingsValidation(): SettingsValidationResult {
  const { settings, isLoading: isLoadingSettings } = useSystemSettings();
  const { models, isLoading: isLoadingModels, setQueryParams } = useModels();

  // Load all models
  useEffect(() => {
    setQueryParams({});
  }, [setQueryParams]);

  const isLoading = isLoadingSettings || isLoadingModels;

  const hasModels = models.length > 0;
  const hasTextModels = models.some((m) => m.model_type === 'text');
  const hasEmbedModels = models.some((m) => m.model_type === 'embed');
  const hasRequiredModelTypes = hasTextModels && hasEmbedModels;

  const missingSettings = useMemo(() => {
    if (isLoading) return [];

    const missing: string[] = [];

    // Always check all settings regardless of model types
    if (!settings?.system_prompt_reflection_model_id) {
      missing.push('System Prompt Reflection model');
    }
    if (!settings?.evaluation_generation_model_id) {
      missing.push('Evaluation Generation model');
    }
    if (!settings?.judge_model_id) {
      missing.push('Judge model');
    }
    if (!settings?.embedding_model_id) {
      missing.push('Embedding model');
    }

    return missing;
  }, [isLoading, settings]);

  const isComplete =
    !isLoading && hasRequiredModelTypes && missingSettings.length === 0;

  return {
    isComplete,
    isLoading,
    missingSettings,
    hasModels,
    hasTextModels,
    hasEmbedModels,
    hasRequiredModelTypes,
  };
}
