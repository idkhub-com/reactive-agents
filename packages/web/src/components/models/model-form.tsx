'use client';

import {
  createModel,
  getModelById,
  updateModel,
} from '@client/api/v1/reactive-agents/models';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/components/ui/form';
import { ModelAutocompleteInput } from '@client/components/ui/model-autocomplete-input';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Skeleton } from '@client/components/ui/skeleton';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useToast } from '@client/hooks/use-toast';
import { useAIProviders } from '@client/providers/ai-providers';
import { useModels } from '@client/providers/models';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AIProvider } from '@shared/types/constants';
import type {
  ModelCreateParams,
  ModelUpdateParams,
} from '@shared/types/data/model';
import { CpuIcon, LoaderIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const modelFormSchema = z.object({
  model_name: z.string().min(1, 'Model name is required'),
  ai_provider_id: z.string().uuid('Please select a valid AI provider API key'),
});

type ModelFormData = z.infer<typeof modelFormSchema>;

interface ModelFormProps {
  modelId?: string;
}

export function ModelForm({ modelId }: ModelFormProps): ReactElement {
  const router = useRouter();
  const goBack = useSmartBack();
  const { toast } = useToast();
  const { refetch } = useModels();
  const { aiProviderConfigs: apiKeys, isLoading: isLoadingAPIKeys } =
    useAIProviders();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(!!modelId);

  const isEdit = !!modelId;

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      model_name: '',
      ai_provider_id: '',
    },
  });

  // Load existing model data for editing
  useEffect(() => {
    if (!modelId) return;

    const loadModel = async () => {
      try {
        setIsLoadingModel(true);
        const model = await getModelById(modelId);

        form.reset({
          model_name: model.model_name,
          ai_provider_id: model.ai_provider_id,
        });
      } catch (error) {
        toast({
          title: 'Failed to load model',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred.',
          variant: 'destructive',
        });
        goBack();
      } finally {
        setIsLoadingModel(false);
      }
    };

    loadModel();
  }, [modelId, form, toast, goBack]);

  const onSubmit = async (data: ModelFormData) => {
    try {
      setIsLoading(true);

      if (isEdit && modelId) {
        const updateData: ModelUpdateParams = {
          model_name: data.model_name,
        };
        await updateModel(modelId, updateData);

        toast({
          title: 'Model updated',
          description: `Model "${data.model_name}" has been updated successfully.`,
        });
      } else {
        const createData: ModelCreateParams = {
          model_name: data.model_name,
          ai_provider_id: data.ai_provider_id,
          model_type: 'text',
        };
        await createModel(createData);

        toast({
          title: 'Model created',
          description: `Model "${data.model_name}" has been created successfully.`,
        });

        // Reset form after successful creation to clear data
        form.reset();
      }

      await refetch();
      router.push('/models');
    } catch (error) {
      toast({
        title: isEdit ? 'Failed to update model' : 'Failed to create model',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableAPIKeys = apiKeys.filter(
    (apiKey) => apiKey.ai_provider && apiKey.name,
  );

  if (isLoadingModel) {
    return (
      <>
        <PageHeader
          title={isEdit ? 'Edit Model' : 'Add Model'}
          description={
            isEdit
              ? 'Update model configuration'
              : 'Add a new AI model to your workspace'
          }
          showBackButton={true}
          onBack={goBack}
        />
        <div className="p-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit Model' : 'Add Model'}
        description={
          isEdit
            ? 'Update model configuration'
            : 'Add a new AI model to your workspace'
        }
        showBackButton={true}
        onBack={goBack}
      />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CpuIcon className="h-5 w-5" />
              {isEdit ? 'Update Model' : 'Create New Model'}
            </CardTitle>
            <CardDescription>
              {isEdit
                ? 'Update the configuration for this AI model.'
                : 'Configure a new AI model for use in your workspace.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="model_name"
                  render={({ field }) => {
                    const selectedProviderId = form.watch('ai_provider_id');
                    const selectedProvider = availableAPIKeys.find(
                      (key) => key.id === selectedProviderId,
                    );
                    const provider = selectedProvider?.ai_provider as
                      | AIProvider
                      | undefined;

                    return (
                      <FormItem>
                        <FormLabel>Model Name</FormLabel>
                        <FormControl>
                          <ModelAutocompleteInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            provider={provider}
                            placeholder="e.g., gpt-5, claude-sonnet-4-5, gemini-2.5-pro"
                            disabled={isEdit}
                            aria-invalid={!!form.formState.errors.model_name}
                          />
                        </FormControl>
                        <FormDescription>
                          The name of the AI model as provided by the AI
                          provider.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="ai_provider_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider API Key</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEdit || isLoadingAPIKeys}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingAPIKeys
                                  ? 'Loading API keys...'
                                  : isEdit
                                    ? 'API key cannot be changed'
                                    : 'Select an API key'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableAPIKeys.length === 0 ? (
                            <SelectItem value="no-keys" disabled>
                              No API keys available
                            </SelectItem>
                          ) : (
                            availableAPIKeys.map((apiKey) => (
                              <SelectItem key={apiKey.id} value={apiKey.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {apiKey.name}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {apiKey.ai_provider}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {isEdit
                          ? 'The API key associated with this model cannot be changed.'
                          : 'Select the API key that will be used to access this model.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goBack()}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || (isLoadingAPIKeys && !isEdit)}
                  >
                    {isLoading && (
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {isEdit ? 'Update Model' : 'Create Model'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
