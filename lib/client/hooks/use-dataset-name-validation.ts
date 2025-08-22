import { getDatasets } from '@client/api/v1/idk/evaluations/datasets';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from './use-debounce';

export interface DatasetNameValidationResult {
  isValidating: boolean;
  isAvailable: boolean | null;
  existingNames: string[];
  error: string | null;
  suggestAlternativeName: (name: string) => string;
}

/**
 * Hook to validate dataset name uniqueness with debounced checking
 * @param name - The dataset name to validate
 * @param agentId - The agent ID to check uniqueness within
 * @param enabled - Whether to enable validation (defaults to true)
 * @param debounceMs - Debounce delay in milliseconds (defaults to 300)
 */
export function useDatasetNameValidation(
  name: string,
  agentId: string | undefined,
  enabled = true,
  debounceMs = 300,
): DatasetNameValidationResult {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounce the name to avoid excessive API calls
  const debouncedName = useDebounce(name, debounceMs);

  // Only validate if we have both agent ID and a non-empty name
  const shouldValidate =
    enabled && !!agentId && debouncedName.trim().length > 0;

  // Query to fetch existing datasets for the agent
  const {
    data: datasets = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['datasets', agentId, 'name-validation'],
    queryFn: () => getDatasets({ agent_id: agentId }),
    enabled: shouldValidate,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1, // Only retry once to avoid excessive requests
  });

  // Extract existing dataset names
  const existingNames = useMemo(
    () => datasets.map((dataset) => dataset.name.toLowerCase()),
    [datasets],
  );

  // Check if the current name is available
  const isAvailable = useMemo(() => {
    if (!shouldValidate || isLoading || queryError) {
      return null;
    }

    const normalizedName = debouncedName.trim().toLowerCase();
    if (normalizedName === '') {
      return null;
    }

    return !existingNames.includes(normalizedName);
  }, [shouldValidate, isLoading, debouncedName, existingNames, queryError]);

  // Handle validation errors
  useEffect(() => {
    if (queryError) {
      setValidationError('Failed to validate dataset name');
    } else {
      setValidationError(null);
    }
  }, [queryError]);

  // Suggest alternative names if the current name is taken
  const suggestAlternativeName = useCallback(
    (baseName: string): string => {
      const normalizedBase = baseName.trim();
      let counter = 1;
      let suggestion = `${normalizedBase}_${counter}`;

      while (
        existingNames.includes(suggestion.toLowerCase()) &&
        counter < 100
      ) {
        counter++;
        suggestion = `${normalizedBase}_${counter}`;
      }

      return suggestion;
    },
    [existingNames],
  );

  return {
    isValidating: isLoading && shouldValidate,
    isAvailable,
    existingNames: datasets.map((d) => d.name),
    error: validationError,
    suggestAlternativeName,
  };
}
