'use client';

import { useNavigation } from '@client/providers/navigation';
import type { ReactElement } from 'react';
import { ConfigurationsListView } from './optimizations-list-view';

export function ConfigurationsView(): ReactElement {
  const { navigationState } = useNavigation();
  const { selectedAgent, selectedSkill } = navigationState;

  if (!selectedAgent || !selectedSkill) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          No agent or skill selected. Please select an agent and skill to view
          configurations.
        </div>
      </div>
    );
  }

  return (
    <ConfigurationsListView
      agentId={selectedAgent.id}
      skillId={selectedSkill.id}
      agentName={selectedAgent.name}
      skillName={selectedSkill.name}
    />
  );
}
