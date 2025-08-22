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
