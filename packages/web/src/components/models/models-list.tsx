'use client';

import { deleteModel } from '@client/api/v1/reactive-agents/models';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
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
import { useToast } from '@client/hooks/use-toast';
import { useAIProviders } from '@client/providers/ai-providers';
import { useModels } from '@client/providers/models';
import { compareModels } from '@client/utils/model-sorting';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import type { Model } from '@shared/types/data/model';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CpuIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function ModelsListView(): ReactElement {
  const { toast } = useToast();
  const { models, isLoading, error, setQueryParams, refetch } = useModels();
  const { aiProviderConfigs: apiKeys } = useAIProviders();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Initialize with empty query params to load all models
  useEffect(() => {
    setQueryParams({});
  }, [setQueryParams]);

  // Filter models and sort alphabetically by model name, then by provider
  const filteredModels = models
    .filter((model) => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const apiKey = apiKeys.find((key) => key.id === model.ai_provider_id);
        return (
          model.model_name.toLowerCase().includes(searchLower) ||
          apiKey?.ai_provider?.toLowerCase().includes(searchLower) ||
          apiKey?.name?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const providerA = apiKeys.find((k) => k.id === a.ai_provider_id);
      const providerB = apiKeys.find((k) => k.id === b.ai_provider_id);
      return compareModels(
        { modelName: a.model_name, providerName: providerA?.name || '' },
        { modelName: b.model_name, providerName: providerB?.name || '' },
      );
    });

  const handleDeleteModel = async (model: Model) => {
    if (isDeleting) return;

    try {
      setIsDeleting(model.id);
      await deleteModel(model.id);

      toast({
        title: 'Model deleted',
        description: `Model "${model.model_name}" has been deleted successfully.`,
      });

      await refetch();
    } catch (error) {
      toast({
        title: 'Failed to delete model',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getProviderInfo = (apiKeyId: string) => {
    const apiKey = apiKeys.find((key) => key.id === apiKeyId);
    const rawProvider = apiKey?.ai_provider as AIProvider;
    return {
      provider: rawProvider
        ? PrettyAIProvider[rawProvider] || rawProvider
        : 'Unknown',
      name: apiKey?.name || 'Unknown',
    };
  };

  return (
    <>
      <PageHeader
        title="Models"
        description="Manage AI models available in your workspace"
        actions={
          <Button asChild>
            <Link href="/models/create">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Model
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search and Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Models</CardTitle>
            <CardDescription>Search and filter your AI models</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search models or providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={refetch}>
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Models List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CpuIcon className="h-5 w-5" />
                  Models ({filteredModels.length})
                </CardTitle>
                <CardDescription>
                  AI models configured in your workspace
                </CardDescription>
              </div>
              {!searchQuery && (
                <Button asChild>
                  <Link href="/models/create">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Model
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_) => (
                  <div key={nanoid()} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={refetch}>
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-8">
                <CpuIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No models found' : 'No models configured'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No models match your search criteria.'
                    : 'Get started by adding your first AI model.'}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link href="/models/create">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Your First Model
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModels.map((model) => {
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
                              {model.model_type === 'embed'
                                ? `Embed (${model.embedding_dimensions})`
                                : 'Text'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {providerInfo.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {providerInfo.name}
                            </div>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/models/${model.id}/edit`}>
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteModel(model)}
                                  disabled={isDeleting === model.id}
                                >
                                  <TrashIcon className="h-4 w-4 mr-2" />
                                  {isDeleting === model.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
