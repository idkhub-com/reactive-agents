'use client';

import { SkillsListView } from '@client/components/agents/skills';
import { useNavigation } from '@client/providers/navigation';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export default function AgentSkillsPage(): ReactElement {
  const { navigationState, isLoadingFromStorage } = useNavigation();
  const router = useRouter();

  // Handle case where agent name in URL doesn't exist
  useEffect(() => {
    if (!isLoadingFromStorage && !navigationState.selectedAgent) {
      // Agent not found, redirect to /agents with error state
      router.push('/agents?error=agent-not-found');
    }
  }, [isLoadingFromStorage, navigationState.selectedAgent, router]);

  if (isLoadingFromStorage) {
    return <div>Loading...</div>;
  }

  if (!navigationState.selectedAgent) {
    return <div>Agent not found</div>;
  }

  return <SkillsListView />;
}
