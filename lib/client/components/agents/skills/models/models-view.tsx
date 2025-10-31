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
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Skeleton } from '@client/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import { useSkills } from '@client/providers/skills';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CpuIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { AddModelsDialog } from './add-models-dialog';

export function ModelsView(): ReactElement {
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const goBack = useSmartBack();
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterCreate = searchParams.get('afterCreate') === 'true';
  const {
    apiKeys,
    isLoading: isLoadingAPIKeys,
    refreshAPIKeys,
  } = useAIProviderAPIKeys();

  const {
    skillModels,
    isLoadingSkillModels,
    skillModelsError,
    setSkillId,
    refetchSkillModels,
  } = useModels();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'provider'>(
    'created_at',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get provider info for a model
  const getProviderInfo = (apiKeyId: string) => {
    if (isLoadingAPIKeys) {
      return {
        provider: 'Loading...',
        name: 'Loading...',
      };
    }

    const apiKey = apiKeys.find((key) => key.id === apiKeyId);
    const rawProvider = apiKey?.ai_provider as AIProvider;
    return {
      provider: rawProvider
        ? PrettyAIProvider[rawProvider] || rawProvider
        : 'Unknown',
      name: apiKey?.name || 'Unknown',
    };
  };

  // Set skill ID when skill changes
  useEffect(() => {
    if (selectedSkill) {
      setSkillId(selectedSkill.id);
    }
  }, [selectedSkill, setSkillId]);

  // Refresh API keys when component mounts
  useEffect(() => {
    refreshAPIKeys();
  }, [refreshAPIKeys]);

  // Filter and sort models
  const filteredAndSortedModels = skillModels
    .filter((model) =>
      model.model_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.model_name.localeCompare(b.model_name);
          break;
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'provider': {
          const providerA = getProviderInfo(a.ai_provider_id).provider;
          const providerB = getProviderInfo(b.ai_provider_id).provider;
          comparison = providerA.localeCompare(providerB);
          break;
        }
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleContinueToEvaluations = () => {
    if (selectedAgent && selectedSkill) {
      router.push(
        `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}/evaluations-2/create`,
      );
    }
  };

  // Early return if no skill or agent selected
  if (!selectedSkill || !selectedAgent) {
    return (
      <>
        <PageHeader
          title="Models"
          description="No skill selected. Please select a skill to view its models."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No skill selected. Please select a skill to view its models.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Models for ${selectedSkill.name}`}
        description={
          afterCreate
            ? 'Add at least one model to your skill to get started'
            : 'Manage AI models available for this skill'
        }
        showBackButton={true}
        onBack={goBack}
        actions={
          <div className="flex gap-2">
            <AddModelsDialog
              skillId={selectedSkill.id}
              onModelsAdded={refetchSkillModels}
            />
            {afterCreate && (
              <Button onClick={handleContinueToEvaluations} variant="default">
                Continue to Evaluations
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {afterCreate && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CpuIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Add Models to Your Skill
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Your skill has been created! Now add at least one AI model
                    to enable your skill to process requests. Click "Add Models"
                    above to select from your configured AI providers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Models</CardTitle>
            <CardDescription>
              Search and filter the models available for this skill
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search models..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(value: 'name' | 'created_at' | 'provider') =>
                    setSortBy(value)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created_at">Date Added</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortOrder}
                  onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refetchSkillModels}
                >
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Models List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CpuIcon className="h-5 w-5" />
              Available Models ({filteredAndSortedModels.length})
            </CardTitle>
            <CardDescription>
              AI models that can be used with this skill
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSkillModels ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map(() => (
                  <div key={nanoid()} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : skillModelsError ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">{skillModelsError}</p>
                <Button variant="outline" onClick={refetchSkillModels}>
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : filteredAndSortedModels.length === 0 ? (
              <div className="text-center py-8">
                <CpuIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No models found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? 'No models match your search criteria.'
                    : 'This skill has no models configured yet.'}
                </p>
                <AddModelsDialog
                  skillId={selectedSkill.id}
                  onModelsAdded={refetchSkillModels}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedModels.map((model) => {
                      const providerInfo = getProviderInfo(
                        model.ai_provider_id,
                      );
                      return (
                        <TableRow key={model.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <CpuIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {model.model_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {model.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {providerInfo.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  {format(
                                    new Date(model.created_at),
                                    'MMM dd, yyyy',
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {format(new Date(model.created_at), 'PPpp')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              <div className="text-muted-foreground">
                                Usage: Coming soon
                              </div>
                              <div className="text-muted-foreground">
                                Cost: Coming soon
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove model from skill</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
