'use client';

import { createModel } from '@client/api/v1/reactive-agents/models';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { PageHeader } from '@client/components/ui/page-header';
import { useToast } from '@client/hooks/use-toast';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import type { AIProvider } from '@shared/types/constants';
import { PrettyAIProvider } from '@shared/types/constants';
import {
  AlertCircle,
  CpuIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

interface AddModelsViewProps {
  providerId: string;
}

interface ModelField {
  id: string;
  modelName: string;
  error?: string;
}

export function AddModelsView({
  providerId,
}: AddModelsViewProps): ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const { apiKeys } = useAIProviderAPIKeys();
  const { refetch } = useModels();

  const [modelFields, setModelFields] = useState<ModelField[]>([
    { id: nanoid(), modelName: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const provider = apiKeys.find((key) => key.id === providerId);

  useEffect(() => {
    if (!provider) {
      router.push('/ai-providers');
    }
  }, [provider, router]);

  if (!provider) {
    return <div>Loading...</div>;
  }

  const handleAddField = () => {
    setModelFields([...modelFields, { id: nanoid(), modelName: '' }]);
  };

  const handleRemoveField = (id: string) => {
    if (modelFields.length === 1) return; // Keep at least one field
    setModelFields(modelFields.filter((field) => field.id !== id));
  };

  const handleModelNameChange = (id: string, value: string) => {
    setModelFields(
      modelFields.map((field) =>
        field.id === id
          ? { ...field, modelName: value, error: undefined }
          : field,
      ),
    );
  };

  const handleSubmit = async () => {
    // Validate all fields
    const updatedFields = modelFields.map((field) => ({
      ...field,
      error:
        field.modelName.trim() === '' ? 'Model name is required' : undefined,
    }));

    setModelFields(updatedFields);

    // Check if any field has an error
    if (updatedFields.some((field) => field.error)) {
      return;
    }

    // Get unique model names
    const modelNames = updatedFields.map((field) => field.modelName.trim());
    const uniqueModelNames = Array.from(new Set(modelNames));

    if (uniqueModelNames.length !== modelNames.length) {
      toast({
        title: 'Duplicate model names',
        description: 'Please ensure all model names are unique.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create all models
      await Promise.all(
        uniqueModelNames.map((modelName) =>
          createModel({
            model_name: modelName,
            ai_provider_id: provider.id,
          }),
        ),
      );

      toast({
        title: 'Models added successfully',
        description: `Added ${uniqueModelNames.length} model(s) to ${provider.name}.`,
      });

      // Navigate back to providers page with provider selected
      await refetch();
      router.push(`/ai-providers?provider=${provider.id}`);
    } catch (error) {
      console.error('Error adding models:', error);
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

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <PageHeader
        title="Add Models"
        description={`Add models for ${provider.name}`}
        onBack={handleBack}
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CpuIcon className="h-5 w-5" />
              Add Models to{' '}
              {PrettyAIProvider[provider.ai_provider as AIProvider] ||
                provider.ai_provider}
            </CardTitle>
            <CardDescription>
              Add one or more models for this AI provider. You can add multiple
              models at once by clicking the "+" button.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                  Model names
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Enter the exact model name as specified by the AI provider
                  (e.g., "gpt-5", "claude-sonnet-4-5").
                </p>
              </div>
            </div>

            {/* Model Fields */}
            <div className="space-y-4">
              {modelFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`model-${field.id}`}>
                      Model {index + 1}
                      {modelFields.length > 1 && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (optional)
                        </span>
                      )}
                    </Label>
                    <Input
                      id={`model-${field.id}`}
                      placeholder="e.g., gpt-5, claude-sonnet-4-5"
                      value={field.modelName}
                      onChange={(e) =>
                        handleModelNameChange(field.id, e.target.value)
                      }
                      className={field.error ? 'border-destructive' : ''}
                    />
                    {field.error && (
                      <p className="text-xs text-destructive mt-1">
                        {field.error}
                      </p>
                    )}
                  </div>
                  <div className="pt-6 flex gap-1">
                    {index === modelFields.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleAddField}
                        className="shrink-0"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    )}
                    {modelFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveField(field.id)}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4 mr-2" />
                    Add{' '}
                    {modelFields.filter((f) => f.modelName.trim()).length || 1}{' '}
                    Model
                    {modelFields.filter((f) => f.modelName.trim()).length !== 1
                      ? 's'
                      : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
