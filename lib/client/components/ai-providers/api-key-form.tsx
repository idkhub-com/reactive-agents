'use client';

import type { AIProviderSchemaResponse } from '@client/api/v1/reactive-agents/ai-providers';
import { getAIProviderSchemas } from '@client/api/v1/reactive-agents/ai-providers';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@client/components/ui/command';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AIProvider,
  DEFAULT_SELF_HOSTED_URLS,
  PrettyAIProvider,
} from '@shared/types/constants';
import type {
  AIProviderConfig,
  AIProviderConfigCreateParams,
  AIProviderConfigUpdateParams,
} from '@shared/types/data/ai-provider';
import {
  Check,
  ChevronsUpDown,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  SaveIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const MAX_NAME_LENGTH = 100;

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
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or less`),
  api_key: z.string().nullable().optional(),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
});

type FormData = z.infer<typeof formSchema>;

interface APIKeyFormProps {
  apiKey?: AIProviderConfig;
  mode: 'create' | 'edit';
}

export function APIKeyForm({ apiKey, mode }: APIKeyFormProps): ReactElement {
  const router = useRouter();
  const { createAPIKey, updateAPIKey, isCreating, isUpdating } =
    useAIProviderAPIKeys();
  const [showAPIKey, setShowAPIKey] = useState(false);
  const [providerSchemas, setProviderSchemas] = useState<
    Record<string, AIProviderSchemaResponse>
  >({});
  const [schemasLoading, setSchemasLoading] = useState(true);
  const [providerComboboxOpen, setProviderComboboxOpen] = useState(false);

  // Custom resolver that validates API key based on provider requirements
  const customResolver = async (
    data: FormData,
    context: unknown,
    // biome-ignore lint/suspicious/noExplicitAny: resolver options type compatibility
    options: any,
  ) => {
    // First run base schema validation
    const baseResult = await zodResolver(formSchema)(data, context, options);

    // Additional API key validation based on provider
    const selectedSchema = providerSchemas[data.ai_provider];
    if (selectedSchema?.isAPIKeyRequired) {
      const isAPIKeyEmpty = !data.api_key || data.api_key.trim() === '';

      // In create mode, API key is required
      if (mode === 'create' && isAPIKeyEmpty) {
        return {
          values: {},
          errors: {
            ...baseResult.errors,
            api_key: {
              type: 'manual',
              message: 'API key is required for this provider',
            },
          } as FieldErrors<FormData>,
        };
      }

      // In edit mode, only required if no existing key
      if (mode === 'edit' && isAPIKeyEmpty && !apiKey?.api_key) {
        return {
          values: {},
          errors: {
            ...baseResult.errors,
            api_key: {
              type: 'manual',
              message: 'API key is required for this provider',
            },
          } as FieldErrors<FormData>,
        };
      }
    }

    return baseResult;
  };

  const form = useForm({
    resolver: customResolver,
    defaultValues: {
      ai_provider: apiKey?.ai_provider || '',
      name: apiKey?.name || '',
      api_key: apiKey?.api_key || '',
      custom_fields: apiKey?.custom_fields || {},
    },
  });

  const selectedProvider = useWatch({
    control: form.control,
    name: 'ai_provider',
  });

  const prevProviderRef = useRef<string>(selectedProvider);

  // Fetch provider schemas on mount
  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const schemas = await getAIProviderSchemas();
        setProviderSchemas(schemas);
      } catch (error) {
        console.error('Failed to fetch provider schemas:', error);
      } finally {
        setSchemasLoading(false);
      }
    };
    fetchSchemas();
  }, []);

  // Auto-clear custom_fields when switching providers and update validation
  useEffect(() => {
    if (
      prevProviderRef.current &&
      prevProviderRef.current !== selectedProvider
    ) {
      form.setValue('custom_fields', {});
    }
    prevProviderRef.current = selectedProvider;

    // Clear existing errors when provider changes
    if (selectedProvider && providerSchemas[selectedProvider]) {
      form.clearErrors();
    }
  }, [selectedProvider, form, providerSchemas]);

  const onSubmit = async (data: FormData) => {
    try {
      if (mode === 'create') {
        const createParams: AIProviderConfigCreateParams = {
          ai_provider: data.ai_provider,
          name: data.name,
          api_key: data.api_key,
          custom_fields: data.custom_fields || {},
        };
        const newProvider = await createAPIKey(createParams);
        // Navigate to add models view for the new provider
        // The mutation's onSuccess already waits for cache invalidation
        router.push(`/ai-providers/${newProvider.id}/add-models`);
      } else if (apiKey) {
        const updateParams: AIProviderConfigUpdateParams = {
          ai_provider: data.ai_provider,
          name: data.name,
          ...(data.api_key !== apiKey.api_key && { api_key: data.api_key }),
        };

        // Only include custom_fields if they have changed
        if (
          JSON.stringify(data.custom_fields) !==
          JSON.stringify(apiKey.custom_fields)
        ) {
          updateParams.custom_fields = data.custom_fields || {};
        }

        await updateAPIKey(apiKey.id, updateParams);
        router.push('/ai-providers');
      }
    } catch (error) {
      // Error handling is done in the provider, but log for debugging
      console.error('Error in form submission:', error);
      // Re-throw to prevent navigation on error
      throw error;
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isSubmitting = isCreating || isUpdating;

  // Check if the selected provider has custom fields
  const selectedProviderSchema = providerSchemas[selectedProvider];
  const hasCustomFields = Boolean(
    selectedProviderSchema?.hasCustomFields &&
      selectedProviderSchema.schema?.properties,
  );

  return (
    <>
      <PageHeader
        title={mode === 'create' ? 'Add AI Provider' : 'Edit AI Provider'}
        description={
          mode === 'create'
            ? 'Add a new AI provider'
            : 'Update your AI provider configuration'
        }
        onBack={handleBack}
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              {mode === 'create' ? 'Add New AI Provider' : 'Edit AI Provider'}
            </CardTitle>
            <CardDescription>
              {mode === 'create'
                ? 'Configure your AI provider. API keys will be encrypted and stored securely.'
                : 'Update your AI provider configuration. Leave the API key field unchanged to keep the existing key.'}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>AI Provider</FormLabel>
                      <Popover
                        open={providerComboboxOpen}
                        onOpenChange={setProviderComboboxOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="justify-between w-[240px]"
                            >
                              {field.value
                                ? AI_PROVIDERS.find(
                                    (provider) =>
                                      provider.value === field.value,
                                  )?.label
                                : 'Select an AI provider'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[240px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search AI providers..." />
                            <CommandList>
                              <CommandEmpty>No provider found.</CommandEmpty>
                              <CommandGroup>
                                {AI_PROVIDERS.map((provider) => (
                                  <CommandItem
                                    key={provider.value}
                                    value={provider.label}
                                    onSelect={() => {
                                      field.onChange(provider.value);
                                      setProviderComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={
                                        provider.value === field.value
                                          ? 'mr-2 h-4 w-4 opacity-100'
                                          : 'mr-2 h-4 w-4 opacity-0'
                                      }
                                    />
                                    {provider.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        API Key
                        {!(selectedProviderSchema?.isAPIKeyRequired ?? true) &&
                          ' (Optional)'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showAPIKey ? 'text' : 'password'}
                            placeholder="API key to access the provider"
                            {...field}
                            value={field.value ?? ''}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!schemasLoading &&
                hasCustomFields &&
                selectedProviderSchema?.schema?.properties
                  ? Object.entries(
                      selectedProviderSchema.schema.properties as Record<
                        string,
                        {
                          type?: string;
                          description?: string;
                          maxLength?: number;
                          format?: string;
                        }
                      >,
                    ).map(([fieldName, fieldSchema]) => {
                      const fieldType = fieldSchema.type;
                      const description = fieldSchema.description;
                      const isRequired =
                        (
                          selectedProviderSchema.schema?.required as
                            | string[]
                            | undefined
                        )?.includes(fieldName) || false;

                      return (
                        <FormItem key={fieldName}>
                          <FormLabel>
                            {fieldName
                              .split('_')
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(' ')}
                            {!isRequired && ' (Optional)'}
                          </FormLabel>
                          {description && (
                            <FormDescription className="p-0 m-0">
                              {description}
                            </FormDescription>
                          )}
                          <FormControl>
                            <Input
                              type={
                                fieldSchema.format === 'uri' ? 'url' : 'text'
                              }
                              placeholder={
                                DEFAULT_SELF_HOSTED_URLS[
                                  selectedProvider as AIProvider
                                ] ||
                                (fieldType === 'string'
                                  ? 'Enter value'
                                  : undefined)
                              }
                              value={
                                (form.watch('custom_fields')?.[
                                  fieldName
                                ] as string) || ''
                              }
                              onChange={(e) => {
                                const currentFields =
                                  form.getValues('custom_fields') || {};
                                form.setValue('custom_fields', {
                                  ...currentFields,
                                  [fieldName]: e.target.value || undefined,
                                });
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    })
                  : null}

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
                          ? 'Create AI Provider'
                          : 'Update AI Provider'}
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
