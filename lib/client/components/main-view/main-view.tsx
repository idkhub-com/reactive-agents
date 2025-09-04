import { AgentsView, AgentView } from '@client/components/agents';
import { CreateAgentView } from '@client/components/agents/create-agent-view';
import {
  CreateDatasetView,
  DatasetsView,
  DatasetView,
} from '@client/components/datasets-view';
import { LogsView } from '@client/components/logs-view';
import {
  CreateSkillView,
  SkillsView,
  SkillView,
} from '@client/components/skills';
import { DatasetsProvider } from '@client/providers/datasets';
import { LogsProvider } from '@client/providers/logs';
import { useEffect, useState } from 'react';

export function MainView(): React.ReactElement {
  const [isMounted, setMounted] = useState(false);
  const [listenerMounted, setListenerMounted] = useState(false);
  const [fragment, setFragment] = useState<string | null>(null);

  useEffect(() => {
    if (isMounted) {
      // Add listener to the window
      if (!listenerMounted) {
        window.addEventListener('hashchange', () => {
          const fragment = window.location.hash.replace('#', '');
          setFragment(fragment.length > 0 ? fragment : null);
        });
        setListenerMounted(true);
      }
      const hash = window.location.hash;
      if (hash) {
        setFragment(hash.replace('#', ''));
      } else {
        setFragment(null);
      }
    } else {
      setMounted(true);
    }
  }, [isMounted, listenerMounted]);

  // Parse fragment for agent view (format: agent:agent-id)
  const isAgentView = fragment?.startsWith('agent:');

  // Parse fragment for skill view (format: skill:skill-id)
  const isSkillView = fragment?.startsWith('skill:');

  // Parse fragment for dataset view (format: dataset:dataset-id or dataset:dataset-id/log:log-id)
  const isDatasetView = fragment?.startsWith('dataset:');

  // Determine if the current view needs scrolling
  const needsScrolling =
    fragment === 'create-agent' ||
    fragment === 'agents' ||
    isAgentView ||
    fragment === 'create-skill' ||
    fragment === 'skills' ||
    isSkillView ||
    fragment === 'create-dataset' ||
    fragment === 'datasets' ||
    isDatasetView;
  const overflowClass = needsScrolling ? 'overflow-auto' : 'overflow-hidden';

  return (
    <div
      className={`relative flex w-full flex-1 flex-col h-full ${overflowClass}`}
    >
      {fragment === 'agents' && <AgentsView />}
      {fragment === 'create-agent' && <CreateAgentView />}
      {isAgentView && (
        <AgentView
          agentId={fragment?.replace('agent:', '') || ''}
          onClose={() => setFragment(null)}
        />
      )}
      {fragment === 'skills' && <SkillsView />}
      {fragment === 'create-skill' && <CreateSkillView />}
      {isSkillView && (
        <SkillView
          skillId={fragment?.replace('skill:', '') || ''}
          onClose={() => setFragment(null)}
        />
      )}
      <LogsProvider>
        <DatasetsProvider>
          {fragment === 'datasets' && <DatasetsView />}
          {fragment === 'create-dataset' && <CreateDatasetView />}
          {isDatasetView && (
            <DatasetView
              key={
                fragment?.split('/')[0]?.replace('dataset:', '') || 'dataset'
              }
              datasetId={fragment?.split('/')[0]?.replace('dataset:', '') || ''}
            />
          )}
        </DatasetsProvider>
        {fragment === 'logs' && <LogsView />}
      </LogsProvider>
    </div>
  );
}
