'use client';

import { getModels } from '@client/api/v1/reactive-agents/models';
import { getSystemSettings } from '@client/api/v1/reactive-agents/system-settings';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage(): null {
  const router = useRouter();

  useEffect(() => {
    async function checkSettingsAndRedirect(): Promise<void> {
      try {
        // Fetch models and settings in parallel
        const [models, settings] = await Promise.all([
          getModels({}),
          getSystemSettings(),
        ]);

        // Check if we have any models at all
        if (models.length === 0) {
          router.replace('/ai-providers');
          return;
        }

        // Check if we have both text and embed models
        const hasTextModels = models.some((m) => m.model_type === 'text');
        const hasEmbedModels = models.some((m) => m.model_type === 'embed');

        if (!hasTextModels || !hasEmbedModels) {
          // Missing required model types, go to AI providers to add them
          router.replace('/ai-providers');
          return;
        }

        // Check if all required settings are configured
        const hasAllSettings =
          settings.system_prompt_reflection_model_id &&
          settings.evaluation_generation_model_id &&
          settings.judge_model_id &&
          settings.embedding_model_id;

        if (!hasAllSettings) {
          // Settings incomplete, go to settings page
          router.replace('/settings');
          return;
        }

        // Everything is configured, go to agents
        router.replace('/agents');
      } catch (error) {
        console.error('Failed to check settings:', error);
        // On error, try to go to settings page to let user configure
        router.replace('/settings');
      }
    }

    void checkSettingsAndRedirect();
  }, [router]);

  return null;
}
