'use client';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { PageHeader } from '@client/components/ui/page-header';
import { Skeleton } from '@client/components/ui/skeleton';
import { useSkillConfigurations } from '@client/providers/skill-configurations';
import type { SkillConfiguration } from '@shared/types/data/skill-configuration';
import { PlusIcon, SettingsIcon, TrashIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

interface ConfigurationsListViewProps {
  agentId: string;
  skillId: string;
  agentName: string;
  skillName: string;
}

export function ConfigurationsListView({
  agentId,
  skillId,
  agentName,
  skillName,
}: ConfigurationsListViewProps): ReactElement {
  const {
    skillConfigurations,
    isLoading,
    deleteSkillConfiguration,
    setQueryParams,
  } = useSkillConfigurations();

  const router = useRouter();

  // Update query params when agent/skill changes
  useEffect(() => {
    setQueryParams({
      agent_id: agentId,
      skill_id: skillId,
      limit: 50,
      offset: 0,
    });
  }, [agentId, skillId, setQueryParams]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      await deleteSkillConfiguration(id);
    }
  };

  const handleCreateConfiguration = () => {
    router.push(`/agents/${agentName}/${skillName}/configurations/create`);
  };

  const handleEditConfiguration = (configuration: SkillConfiguration) => {
    const encodedName = encodeURIComponent(configuration.name);
    router.push(
      `/agents/${agentName}/${skillName}/configurations/${encodedName}`,
    );
  };

  return (
    <>
      <PageHeader
        title={`Configurations - ${skillName}`}
        description="Manage AI configurations for this skill"
        actions={
          <Button onClick={handleCreateConfiguration}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Configuration
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map(() => (
              <Card key={nanoid()}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : skillConfigurations.length === 0 ? (
          <div className="text-center py-12">
            <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-muted-foreground mb-4">
              No configurations found for this skill.
            </div>
            <Button onClick={handleCreateConfiguration}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create your first configuration
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skillConfigurations.map((configuration) => (
              <Card
                key={configuration.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEditConfiguration(configuration)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {configuration.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {configuration.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">
                          {configuration.data.current.params.model}
                        </span>
                      </div>
                      {configuration.data.current.params.temperature && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Temperature:
                          </span>
                          <span className="font-medium">
                            {configuration.data.current.params.temperature}
                          </span>
                        </div>
                      )}
                      {configuration.data.current.params.max_tokens && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Max Tokens:
                          </span>
                          <span className="font-medium">
                            {configuration.data.current.params.max_tokens}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium mb-1">
                          System Prompt Preview:
                        </div>
                        <div className="bg-muted rounded p-2 text-xs font-mono line-clamp-3">
                          {configuration.data.current.params.system_prompt}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Version Hash:</span>
                          <code className="bg-muted px-1 rounded">
                            {configuration.data.current.hash}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Created:{' '}
                      {new Date(configuration.created_at).toLocaleDateString()}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(configuration.id);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
