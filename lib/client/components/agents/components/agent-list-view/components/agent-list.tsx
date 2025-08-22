'use client';

import { Button } from '@client/components/ui/button';
import { useAgents } from '@client/providers/agents';
import { cn } from '@client/utils/ui/utils';
import type { Agent } from '@shared/types/data';
import { format } from 'date-fns';
import { Bot, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';

interface AgentsListProps {
  agents: Agent[];
}

export function AgentsList({ agents }: AgentsListProps): React.ReactElement {
  const { selectedAgent, setSelectedAgent, deleteAgent } = useAgents();
  const router = useRouter();

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleViewAgent = (agent: Agent) => {
    router.push(`/agents/${agent.id}`);
  };

  const handleDeleteAgent = async (
    e: React.MouseEvent,
    agent: Agent,
  ): Promise<void> => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      try {
        await deleteAgent(agent.id);
      } catch (error) {
        console.error('Error deleting agent:', error);
      }
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-2 p-2">
        {agents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;

          return (
            // biome-ignore lint/a11y/useSemanticElements: Wrapper contains nested buttons; using div with button semantics
            <div
              key={agent.id}
              className={cn(
                'group relative cursor-pointer rounded-lg border p-3 transition-all hover:bg-accent',
                isSelected && 'border-primary bg-accent',
              )}
              role="button"
              tabIndex={0}
              onClick={() => handleViewAgent(agent)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleViewAgent(agent);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">
                        {agent.name}
                      </h3>
                      {isSelected && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {agent.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatTimestamp(agent.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAgent(agent);
                      }}
                      className="h-8 w-8 p-0"
                      title="Set as active agent"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteAgent(e, agent)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete agent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
