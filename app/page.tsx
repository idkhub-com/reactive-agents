'use client';

import { getModels } from '@client/api/v1/reactive-agents/models';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage(): null {
  const router = useRouter();

  useEffect(() => {
    async function checkModelsAndRedirect(): Promise<void> {
      try {
        const models = await getModels({ limit: 1 });

        if (models.length === 0) {
          router.replace('/ai-providers');
        } else {
          router.replace('/agents');
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        router.replace('/agents');
      }
    }

    void checkModelsAndRedirect();
  }, [router]);

  return null;
}
