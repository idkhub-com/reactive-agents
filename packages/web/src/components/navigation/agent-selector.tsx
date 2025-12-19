'use client';

import { useQuery } from '@tanstack/react-query';
import { getAgents } from '@web/api/v1/reactive-agents/agents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { useAgents } from '@web/providers/agents';
import { useNavigation } from '@web/providers/navigation';
import type { ReactElement } from 'react';

export function AgentSelector(): ReactElement | null {
  const { navigationState } = useNavigation();
  const { selectedAgent } = useAgents();
  const navigate = usePermissiveNavigate();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents({ limit: 100 }),
  });

  const handleValueChange = (agentId: string) => {
    if (agentId === 'clear') {
      navigate({ to: '/agents' });
    } else {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        navigate({ to: `/agents/${encodeURIComponent(agent.name)}` });
      }
    }
  };

  if (navigationState.section !== 'agents') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Agent:</span>
      <Select
        value={selectedAgent?.id || ''}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[300px]">
          <SelectValue
            placeholder={isLoading ? 'Loading agents...' : 'Select agent...'}
          />
        </SelectTrigger>
        <SelectContent>
          {selectedAgent && (
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
