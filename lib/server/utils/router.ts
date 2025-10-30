import type { ReactiveAgentsTarget } from '@shared/types/api/request/headers';

/**
 * Selects a provider based on their assigned weights.
 * The weight is used to determine the probability of each provider being chosen.
 * If all providers have a weight of 0, an error will be thrown.
 */
export function selectProviderByWeight(
  targetConfigs: ReactiveAgentsTarget[],
): ReactiveAgentsTarget {
  // Assign a default weight of 1 to providers with undefined weight
  targetConfigs = targetConfigs.map((targetConfig) => ({
    ...targetConfig,
    weight: targetConfig.weight ?? 1,
  }));

  // Compute the total weight
  const totalWeight = targetConfigs.reduce(
    (sum: number, targetConfig: ReactiveAgentsTarget) =>
      sum + targetConfig.weight!,
    0,
  );

  // Select a random weight between 0 and totalWeight
  let randomWeight = Math.random() * totalWeight;

  // Find the provider that corresponds to the selected weight
  for (let index = 0; index < targetConfigs.length; index++) {
    const targetConfig = targetConfigs[index];
    if (randomWeight < targetConfig.weight) {
      return { ...targetConfig, index };
    }
    randomWeight -= targetConfig.weight;
  }

  throw new Error('No provider selected, please check the weights');
}
