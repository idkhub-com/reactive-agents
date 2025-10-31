'use client';

import { getAgents } from '@client/api/v1/reactive-agents/agents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

export function AgentSelector(): ReactElement | null {
  const { navigationState } = useNavigation();
  const { selectedAgent } = useAgents();
  const router = useRouter();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents({ limit: 100 }),
  });

  const handleValueChange = (agentId: string) => {
    if (agentId === 'clear') {
      router.push('/agents');
    } else {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        router.push(`/agents/${encodeURIComponent(agent.name)}`);
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
