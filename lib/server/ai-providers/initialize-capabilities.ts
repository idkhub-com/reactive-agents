/**
 * Initialize model capabilities for all AI providers.
 *
 * This module registers model capability configurations on server startup.
 */

import { registerProviderCapabilities } from '@server/utils/model-validator';
import { providerConfigs } from './index';

/**
 * Register all provider model capabilities.
 * Should be called once on server startup.
 */
export function initializeModelCapabilities(): void {
  for (const [_provider, config] of Object.entries(providerConfigs)) {
    if (config?.modelCapabilities) {
      registerProviderCapabilities(config.modelCapabilities);
    }
  }
}
