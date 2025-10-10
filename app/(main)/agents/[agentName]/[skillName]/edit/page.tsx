'use client';

import { EditSkillView } from '@client/components/agents/skills/edit-skill-view';
import { useNavigation } from '@client/providers/navigation';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export default function EditSkillPage(): ReactElement {
  const { navigationState, isLoadingFromStorage } = useNavigation();
  const router = useRouter();

  // Handle case where agent or skill name in URL doesn't exist
  useEffect(() => {
    if (!isLoadingFromStorage) {
      if (!navigationState.selectedAgent) {
        router.push('/agents?error=agent-not-found');
        return;
      }
      if (!navigationState.selectedSkill) {
        router.push(
          `/agents/${encodeURIComponent(navigationState.selectedAgent.name)}?error=skill-not-found`,
        );
        return;
      }
    }
  }, [
    isLoadingFromStorage,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
    router,
  ]);

  if (isLoadingFromStorage) {
    return <div>Loading...</div>;
  }

  if (!navigationState.selectedAgent || !navigationState.selectedSkill) {
    return <div>Agent or skill not found</div>;
  }

  return <EditSkillView />;
}
