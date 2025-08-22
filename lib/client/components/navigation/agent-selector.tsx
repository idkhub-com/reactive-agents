'use client';

import { getAgents } from '@client/api/v1/idk/agents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useNavigation } from '@client/providers/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';

export function AgentSelector(): ReactElement | null {
  const { navigationState, setSelectedAgent } = useNavigation();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents({ limit: 100 }),
  });

  const handleValueChange = (agentId: string) => {
    if (agentId === 'clear') {
      setSelectedAgent(undefined);
    } else {
      const selectedAgent = agents.find((agent) => agent.id === agentId);
      if (selectedAgent) {
        setSelectedAgent(selectedAgent);
      }
    }
  };

  if (navigationState.section !== 'pipelines') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Agent:</span>
      <Select
        value={navigationState.selectedAgent?.id || ''}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[300px]">
          <SelectValue
            placeholder={isLoading ? 'Loading agents...' : 'Select agent...'}
          />
        </SelectTrigger>
        <SelectContent>
          {navigationState.selectedAgent && (
            <SelectItem value="clear">Clear selection</SelectItem>
          )}
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </SelectItem>
          ))}
          {agents.length === 0 && !isLoading && (
            <SelectItem value="no-agents" disabled>
              No agents found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
