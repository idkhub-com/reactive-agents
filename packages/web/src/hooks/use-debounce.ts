import { useEffect, useState } from 'react';

/**
 * Hook that debounces a value by delaying updates until after `delay` milliseconds
 * have passed since the value was last changed. Useful for optimizing expensive operations
 * like search filtering, API calls, or complex computations.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (recommended: 300-500ms for search, 100-200ms for typing feedback)
 * @returns The debounced value
 *
 * @example
 * ```typescript
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearchQuery = useDebounce(searchQuery, 300);
 *
 * // Expensive filtering only happens 300ms after user stops typing
 * const filteredResults = useMemo(() => {
 *   return data.filter(item => item.name.includes(debouncedSearchQuery));
 * }, [data, debouncedSearchQuery]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
