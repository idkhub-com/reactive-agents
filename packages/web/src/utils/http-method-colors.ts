/**
 * Shared HTTP method color utilities
 * Returns Tailwind CSS classes for HTTP method badge styling
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
 * @returns CSS class string for the method badge
 */
export const getHttpMethodColor = (method?: string): string => {
  const normalized = method?.trim().toUpperCase();
  switch (normalized) {
    case 'GET':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'POST':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'PUT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'PATCH':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

/**
 * Deterministic pale color for a given string (e.g. trace IDs).
 * Hashes the string and picks from a palette of pale background /
 * dark text pairs, with dark-mode variants, so identical IDs always
 * get the same color and different IDs are easy to tell apart.
 */
const TRACE_COLOR_CLASSES = [
  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200',
] as const;

export const getStringHashColor = (value?: string | null): string => {
  if (!value) {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TRACE_COLOR_CLASSES.length;
  return TRACE_COLOR_CLASSES[index];
};
