/**
 * Utility function to sort model options alphabetically.
 * Sorts primarily by model name, then by provider name when model names are equal.
 */

interface SortableModel {
  modelName?: string;
  name?: string;
  providerName?: string;
  provider?: string;
}

/**
 * Comparator function for sorting models.
 * Sorts by model name first (alphabetically), then by provider name (alphabetically).
 */
export function compareModels<T extends SortableModel>(a: T, b: T): number {
  // Get model names (support both modelName and name properties)
  const modelNameA = (a.modelName ?? a.name ?? '').toLowerCase();
  const modelNameB = (b.modelName ?? b.name ?? '').toLowerCase();

  // Compare model names first
  const modelComparison = modelNameA.localeCompare(modelNameB);
  if (modelComparison !== 0) {
    return modelComparison;
  }

  // If model names are equal, compare provider names
  const providerNameA = (a.providerName ?? a.provider ?? '').toLowerCase();
  const providerNameB = (b.providerName ?? b.provider ?? '').toLowerCase();

  return providerNameA.localeCompare(providerNameB);
}

/**
 * Sorts an array of models alphabetically by model name, then by provider name.
 * Returns a new sorted array (does not mutate the original).
 */
export function sortModels<T extends SortableModel>(models: T[]): T[] {
  return [...models].sort(compareModels);
}
