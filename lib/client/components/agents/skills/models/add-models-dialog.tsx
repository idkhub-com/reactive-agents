'use client';

import { addModelsToSkill } from '@client/api/v1/reactive-agents/skills';
import { Button } from '@client/components/ui/button';
import { Checkbox } from '@client/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/components/ui/dialog';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Skeleton } from '@client/components/ui/skeleton';
import { useToast } from '@client/hooks/use-toast';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CpuIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';

interface AddModelsDialogProps {
  skillId: string;
  onModelsAdded: () => void;
  trigger?: ReactNode;
}

export function AddModelsDialog({
  skillId,
  onModelsAdded,
  trigger,
}: AddModelsDialogProps): ReactElement {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchId = useId();
  const selectAllId = useId();
  const providerId = useId();

  const { toast } = useToast();
  const { apiKeys } = useAIProviderAPIKeys();
  const {
    models,
    isLoading,
    error,
    setQueryParams,
    skillModels,
    refetchSkillModels,
  } = useModels();

  // Load all models when dialog opens
  useEffect(() => {
    if (open) {
      setQueryParams({
        limit: 100,
        offset: 0,
      });
    }
  }, [open, setQueryParams]);

  // Get provider info for a model
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

  // Get models that are not already assigned to this skill
  const skillModelIds = new Set(skillModels.map((model) => model.id));
  const availableModels = models.filter(
    (model) => !skillModelIds.has(model.id),
  );

  // Get unique providers from available models
  const availableProviders = Array.from(
    new Set(
      availableModels
        .map((model) => {
          const apiKey = apiKeys.find((key) => key.id === model.ai_provider_id);
          return apiKey?.ai_provider as AIProvider;
        })
        .filter(Boolean),
    ),
  ).sort();

  // Filter models based on search and provider
  const filteredModels = availableModels.filter((model) => {
    const matchesSearch = model.model_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (filterProvider === 'all') {
      return matchesSearch;
    }

    const apiKey = apiKeys.find((key) => key.id === model.ai_provider_id);
    const modelProvider = apiKey?.ai_provider;
    const matchesProvider = modelProvider === filterProvider;

    return matchesSearch && matchesProvider;
  });

  const handleModelToggle = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId],
    );
  };

  const handleSelectAll = () => {
    setSelectedModelIds(
      selectedModelIds.length === filteredModels.length
        ? []
        : filteredModels.map((model) => model.id),
    );
  };

  const handleSubmit = async () => {
    if (selectedModelIds.length === 0) {
      toast({
        title: 'No models selected',
        description: 'Please select at least one model to add.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addModelsToSkill(skillId, selectedModelIds);

      toast({
        title: 'Models added successfully',
        description: `Added ${selectedModelIds.length} model(s) to the skill. Configuration arms are being generated in the background.`,
      });

      // Reset state and close dialog
      setSelectedModelIds([]);
      setSearchTerm('');
      setFilterProvider('all');
      setOpen(false);

      // Refresh skill models and call callback
      await refetchSkillModels();

      // Invalidate the skill validation cache to refresh the UI
      await queryClient.invalidateQueries({
        queryKey: ['skill-validation-models', skillId],
      });

      onModelsAdded();
    } catch (error) {
      console.error('Error adding models to skill:', error);
      toast({
        title: 'Failed to add models',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Models
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Models to Skill</DialogTitle>
          <DialogDescription>
            Select AI models to add to this skill. Only models not already
            assigned are shown.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              Processing time required
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Adding models may take 1-2 minutes as we generate different
              configuration arms (system prompts, parameters, etc.) using AI.
              Please be patient while the process completes.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor={searchId}>Search models</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id={searchId}
                  placeholder="Search by model name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor={providerId}>Provider</Label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger id={providerId}>
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {PrettyAIProvider[provider] || provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Select All */}
          {filteredModels.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={selectAllId}
                checked={selectedModelIds.length === filteredModels.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor={selectAllId} className="text-sm">
                Select all ({filteredModels.length} models)
              </Label>
            </div>
          )}

          {/* Models List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map(() => (
                  <div key={nanoid()} className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-destructive mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQueryParams({ limit: 100, offset: 0 })}
                >
                  Retry
                </Button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-8 text-center">
                <CpuIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No models available
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterProvider !== 'all'
                    ? 'No models match your filters.'
                    : 'All available models are already assigned to this skill.'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredModels.map((model) => {
                  const providerInfo = getProviderInfo(model.ai_provider_id);
                  return (
                    <div
                      key={model.id}
                      className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`model-${model.id}`}
                        checked={selectedModelIds.includes(model.id)}
                        onCheckedChange={() => handleModelToggle(model.id)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`model-${model.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {model.model_name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          ID: {model.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {providerInfo.provider}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedModelIds.length === 0 || isSubmitting}
          >
            {isSubmitting
              ? 'Adding...'
              : `Add ${selectedModelIds.length} Model(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
