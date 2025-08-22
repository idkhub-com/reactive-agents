'use client';

import { AGENT_SEARCH_DEBOUNCE_MS } from '@client/components/agents/constants';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import { useDebounce } from '@client/hooks/use-debounce';
import { useAgents } from '@client/providers/agents';
import { Bot, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AgentsList } from './components/agent-list';

export function AgentListView(): React.ReactElement {
  const { agents, isLoading } = useAgents();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, AGENT_SEARCH_DEBOUNCE_MS);

  // Filter agents based on debounced search term
  const visibleAgents = useMemo(() => {
    if (debouncedSearchTerm) {
      return agents.filter(
        (agent) =>
          agent.name
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          agent.description
            ?.toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()),
      );
    }
    return agents;
  }, [agents, debouncedSearchTerm]);

  const handleCreateAgent = () => {
    router.push('/agents/create');
  };

  return (
    <>
      <PageHeader
        title="Agents"
        description="Manage your AI agents and their configurations"
        actions={
          <Button onClick={handleCreateAgent}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        }
      />
      <div className="p-2 shrink-0 w-full h-full overflow-hidden transition-all duration-800">
        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e): void => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={(): void => {
                  setSearchTerm('');
                }}
                className="self-start"
              >
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col overflow-hidden p-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <Bot className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading agents...
                  </p>
                </div>
              </div>
            ) : visibleAgents.length === 0 ? (
              <div className="flex justify-center py-8">
                <Card className="max-w-md">
                  <CardHeader className="text-center">
                    <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle>
                      {searchTerm ? 'No agents found' : 'No agents yet'}
                    </CardTitle>
                    <CardDescription>
                      {searchTerm
                        ? 'Try adjusting your search criteria'
                        : 'Create your first agent to get started with AI assistance.'}
                    </CardDescription>
                  </CardHeader>
                  {!searchTerm && (
                    <CardContent className="flex justify-center">
                      <Button onClick={handleCreateAgent}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Agent
                      </Button>
                    </CardContent>
                  )}
                </Card>
              </div>
            ) : (
              <AgentsList agents={visibleAgents} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
