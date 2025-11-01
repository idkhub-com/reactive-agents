'use client';

import { deleteModel } from '@client/api/v1/reactive-agents/models';
import { DeleteModelDialog } from '@client/components/agents/skills/models/delete-model-dialog';
import { AIProvidersListView } from '@client/components/ai-providers/ai-providers-list';
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
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
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
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

interface ProvidersAndModelsViewProps {
  selectedProviderId?: string;
}

export function ProvidersAndModelsView({
  selectedProviderId,
}: ProvidersAndModelsViewProps): ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const { apiKeys } = useAIProviderAPIKeys();
  const { models, isLoading, setQueryParams, refetch } = useModels();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(
    selectedProviderId || null,
  );
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const modelsRef = useRef<HTMLDivElement>(null);

  // Initialize models query
  useEffect(() => {
    setQueryParams({});
  }, [setQueryParams]);

  // Set active provider from prop and scroll to models
  useEffect(() => {
    if (selectedProviderId) {
      setActiveProvider(selectedProviderId);
      // Scroll to models section
      setTimeout(() => {
        modelsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [selectedProviderId]);

  // Filter models by active provider
  const filteredModels = models.filter((model) => {
    // Filter by active provider
    if (activeProvider && model.ai_provider_id !== activeProvider) {
      return false;
    }

    // Filter by search query
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
  });

  const handleDeleteClick = (model: Model) => {
    setModelToDelete(model);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!modelToDelete || isDeleting) return;

    try {
      setIsDeleting(modelToDelete.id);
      await deleteModel(modelToDelete.id);

      toast({
        title: 'Model deleted',
        description: `Model "${modelToDelete.model_name}" has been deleted successfully.`,
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

  const activeProviderInfo = activeProvider
    ? apiKeys.find((key) => key.id === activeProvider)
    : null;

  return (
    <div>
      {/* AI Providers Section */}
      <AIProvidersListView
        onProviderSelect={setActiveProvider}
        selectedProviderId={activeProvider}
      />

      {/* Models Section */}
      <div ref={modelsRef} className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CpuIcon className="h-5 w-5" />
                  Models
                  {activeProviderInfo && (
                    <>
                      <span className="text-muted-foreground">for</span>
                      <Badge variant="outline">
                        {PrettyAIProvider[
                          activeProviderInfo.ai_provider as AIProvider
                        ] || activeProviderInfo.ai_provider}
                      </Badge>
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {activeProvider
                    ? `Models using the selected AI provider (${filteredModels.length})`
                    : 'Select a provider above to view its models'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={refetch}>
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>
                {activeProvider && (
                  <Button
                    onClick={() =>
                      router.push(`/ai-providers/${activeProvider}/add-models`)
                    }
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Models
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            {activeProvider && (
              <div className="mb-4">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Models Table */}
            {!activeProvider ? (
              <div className="text-center py-12">
                <CpuIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select an AI provider above to view and manage its models
                </p>
              </div>
            ) : isLoading ? (
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
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-12">
                <CpuIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No models found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No models match your search criteria.'
                    : 'This provider has no models configured yet.'}
                </p>
                <Button
                  onClick={() =>
                    router.push(`/ai-providers/${activeProvider}/add-models`)
                  }
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add your first model
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Added</TableHead>
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
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(model)}
                                  disabled={isDeleting === model.id}
                                  className="text-destructive focus:text-destructive"
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

      <DeleteModelDialog
        model={modelToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
