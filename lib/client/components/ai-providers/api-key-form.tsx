'use client';

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
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { AIProvider, PrettyAIProvider } from '@shared/types/constants';
import type {
  AIProviderAPIKey,
  AIProviderAPIKeyCreateParams,
  AIProviderAPIKeyUpdateParams,
} from '@shared/types/data/ai-provider-api-key';
import { EyeIcon, EyeOffIcon, KeyIcon, SaveIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const AI_PROVIDERS = Object.values(AIProvider)
  .map((provider) => ({
    value: provider,
    label: PrettyAIProvider[provider],
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const formSchema = z.object({
  ai_provider: z.string().min(1, 'Provider is required'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  api_key: z.string().min(1, 'API key is required'),
});

type FormData = z.infer<typeof formSchema>;

interface APIKeyFormProps {
  apiKey?: AIProviderAPIKey;
  mode: 'create' | 'edit';
}

export function APIKeyForm({ apiKey, mode }: APIKeyFormProps): ReactElement {
  const router = useRouter();
  const { createAPIKey, updateAPIKey, isCreating, isUpdating } =
    useAIProviderAPIKeys();
  const [showAPIKey, setShowAPIKey] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ai_provider: apiKey?.ai_provider || '',
      name: apiKey?.name || '',
      api_key: apiKey?.api_key || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (mode === 'create') {
        const createParams: AIProviderAPIKeyCreateParams = {
          ai_provider: data.ai_provider,
          name: data.name,
          api_key: data.api_key,
        };
        await createAPIKey(createParams);
      } else if (apiKey) {
        const updateParams: AIProviderAPIKeyUpdateParams = {
          ai_provider: data.ai_provider,
          name: data.name,
          ...(data.api_key !== apiKey.api_key && { api_key: data.api_key }),
        };
        await updateAPIKey(apiKey.id, updateParams);
      }

      router.push('/ai-providers/api-keys');
    } catch (_error) {
      // Error handling is done in the provider
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <>
      <PageHeader
        title={mode === 'create' ? 'Add API Key' : 'Edit API Key'}
        description={
          mode === 'create'
            ? 'Add a new AI provider API key'
            : 'Update your AI provider API key'
        }
        onBack={handleBack}
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              {mode === 'create' ? 'Add New API Key' : 'Edit API Key'}
            </CardTitle>
            <CardDescription>
              {mode === 'create'
                ? 'Configure your AI provider API key. The key will be encrypted and stored securely.'
                : 'Update your AI provider API key details. Leave the API key field unchanged to keep the existing key.'}
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
                  name="ai_provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an AI provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AI_PROVIDERS.map((provider) => (
                            <SelectItem
                              key={provider.value}
                              value={provider.value}
                            >
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the AI provider for this API key.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Production Key, Development Key"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name to identify this API key.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showAPIKey ? 'text' : 'password'}
                            placeholder="Enter your API key"
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setShowAPIKey(!showAPIKey)}
                          >
                            {showAPIKey ? (
                              <EyeOffIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {mode === 'create'
                          ? 'Your API key will be encrypted before storage.'
                          : 'Leave unchanged to keep the existing API key.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {mode === 'create' ? 'Creating...' : 'Updating...'}
                      </>
                    ) : (
                      <>
                        <SaveIcon className="h-4 w-4 mr-2" />
                        {mode === 'create'
                          ? 'Create API Key'
                          : 'Update API Key'}
                      </>
                    )}
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
